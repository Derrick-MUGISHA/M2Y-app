const Message = require('../models/message');
const Chat = require('../models/chat');
const User = require('../models/user');
const Group = require('../models/group');
const { getIo } = require('../services/websocket_service');

/**
 * Send a message
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, groupId, type, encryptedContent, mediaUrl, expiresAt, isAnonymous } = req.body;
    const senderId = req.user.userId;
    
    // Validate input
    if (!receiverId && !groupId) {
      return res.status(400).json({ message: 'Either receiverId or groupId is required' });
    }
    
    if (!encryptedContent && !mediaUrl) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }
    
    let chatId;
    
    if (groupId) {
      // Sending message to a group
      const group = await Group.findById(groupId);
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is member of the group
      if (!group.isMember(senderId)) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
      
      // Check if anonymous messages are allowed in this group
      if (isAnonymous && !group.allowAnonymousMessages) {
        return res.status(403).json({ message: 'Anonymous messages are not allowed in this group' });
      }
      
      chatId = group.chatId;
      
    } else {
      // Sending message to a user
      
      // Check if receiver exists
      const receiver = await User.findById(receiverId);
      
      if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
      }
      
      // Check if the sender is blocked by the receiver
      if (receiver.isBlocked && receiver.isBlocked(senderId)) {
        return res.status(403).json({ message: 'You cannot send a message to this user' });
      }
      
      // Get or create a one-to-one chat
      const chat = await Chat.getOrCreateOneToOneChat(senderId, receiverId);
      chatId = chat._id;
    }
    
    // Calculate expiryDate if expiresAt is provided
    let expiryDate;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
    } else if (groupId) {
      // If it's a group message, check if there's a default message expiry time
      const group = await Group.findById(groupId);
      if (group && group.messageExpiryTime) {
        expiryDate = new Date(Date.now() + group.messageExpiryTime * 1000);
      }
    }
    
    // Create the message
    const message = new Message({
      chatId,
      senderId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      type: type || 'text',
      encryptedContent,
      mediaUrl,
      expiresAt: expiryDate,
      isAnonymous: isAnonymous || false,
      metadata: req.body.metadata || {},
    });
    
    // Save the message
    await message.save();
    
    // Update the chat's last message and updatedAt
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        lastMessage: message._id,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // If it's not a group message, increment unread count for receiver
    if (!groupId) {
      await chat.incrementUnreadCountForUser(receiverId);
    } else {
      // For group messages, increment unread count for all members except sender
      const group = await Group.findById(groupId)
        .populate('members.user', '_id');
      
      for (const member of group.members) {
        if (member.user._id.toString() !== senderId) {
          await chat.incrementUnreadCountForUser(member.user._id);
        }
      }
    }
    
    // Emit the message event to online users
    const io = getIo();
    
    if (groupId) {
      // Get group members
      const group = await Group.findById(groupId)
        .populate('members.user', '_id');
      
      // Emit message to all online group members (except sender)
      group.members.forEach(member => {
        if (member.user._id.toString() !== senderId) {
          io.to(member.user._id.toString()).emit('message', {
            type: 'message',
            data: message
          });
        }
      });
    } else {
      // Emit message to receiver if online
      io.to(receiverId).emit('message', {
        type: 'message',
        data: message
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a chat
 */
exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    
    // Validate chatId
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if the user is a participant in the chat
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }
    
    // Get messages for this chat, ordered by timestamp
    const messages = await Message.find({
      chatId,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('senderId', 'phoneNumber nickname profileImage');
    
    // Reset unread count for this user
    await chat.resetUnreadCountForUser(userId);
    
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user.userId;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the message belongs to the user
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    if (deleteForEveryone) {
      // Mark the message as deleted for everyone
      message.isDeleted = true;
      await message.save();
      
      // Emit delete message event to online users
      const io = getIo();
      
      if (message.groupId) {
        // Get group members
        const group = await Group.findById(message.groupId)
          .populate('members.user', '_id');
        
        // Emit message to all online group members (except sender)
        group.members.forEach(member => {
          if (member.user._id.toString() !== userId) {
            io.to(member.user._id.toString()).emit('message', {
              type: 'messageDeleted',
              data: { messageId: message._id }
            });
          }
        });
      } else if (message.receiverId) {
        // Emit message to receiver if online
        io.to(message.receiverId.toString()).emit('message', {
          type: 'messageDeleted',
          data: { messageId: message._id }
        });
      }
    } else {
      // Delete just for the user
      // For now, we'll also mark it as deleted since we're not implementing
      // separate deletion states for different users
      message.isDeleted = true;
      await message.save();
    }
    
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update message status (read, delivered)
 */
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!status || !['read', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (read or delivered) is required' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only the receiver should be able to update status
    if (message.receiverId && message.receiverId.toString() !== userId && !message.groupId) {
      return res.status(403).json({ message: 'Only the message recipient can update status' });
    }
    
    // For group message, check if the user is a member
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !group.isMember(userId)) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
    }
    
    // Update the status
    if (status === 'read') {
      await message.markAsReadBy(userId);
    } else if (status === 'delivered') {
      await message.markAsDeliveredTo(userId);
    }
    
    // Emit status update to sender
    const io = getIo();
    io.to(message.senderId.toString()).emit('message', {
      type: status,
      data: {
        messageId: message._id,
        userId
      }
    });
    
    res.status(200).json({ message: `Message marked as ${status}` });
  } catch (error) {
    next(error);
  }
};