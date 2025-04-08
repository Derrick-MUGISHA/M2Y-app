const { Chat, ChatMember, Message } = require('../models/pg_index');
const disappearingMessagesService = require('../services/disappearing_messages_service');

/**
 * Update chat disappearing message settings
 */
exports.updateChatSettings = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { enabled, timeSeconds } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (enabled === undefined) {
      return res.status(400).json({ message: 'Enabled flag is required' });
    }
    
    if (enabled && (timeSeconds === undefined || timeSeconds < 0)) {
      return res.status(400).json({ message: 'Valid time in seconds is required when enabling disappearing messages' });
    }
    
    // Check if chat exists
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // For group chats, check if user is an admin
    if (chat.type === 'group') {
      const member = await ChatMember.findOne({
        where: { chatId, userId, role: 'admin' }
      });
      
      if (!member) {
        return res.status(403).json({ message: 'Only group administrators can update group settings' });
      }
    } else {
      // For direct chats, check if user is a participant
      if (chat.user1Id !== userId && chat.user2Id !== userId) {
        return res.status(403).json({ message: 'You are not a participant of this chat' });
      }
    }
    
    // Update settings
    const updatedChat = await disappearingMessagesService.updateChatDisappearingSettings(
      chatId,
      enabled,
      enabled ? (timeSeconds || 0) : 0
    );
    
    res.status(200).json({
      message: 'Disappearing message settings updated successfully',
      settings: {
        disappearingMessages: updatedChat.settings.disappearingMessages,
        disappearingMessagesTime: updatedChat.settings.disappearingMessagesTime
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user-specific disappearing message settings for a chat
 */
exports.updateUserSettings = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { enabled, timeSeconds } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (enabled === undefined) {
      return res.status(400).json({ message: 'Enabled flag is required' });
    }
    
    // Check if chat exists
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a member of the chat
    const chatMember = await ChatMember.findOne({
      where: { chatId, userId }
    });
    
    if (!chatMember) {
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }
    
    // Update user settings
    const updatedMember = await disappearingMessagesService.updateMemberDisappearingSettings(
      chatId,
      userId,
      enabled,
      timeSeconds
    );
    
    res.status(200).json({
      message: 'Personal disappearing message settings updated successfully',
      settings: {
        disappearingMessages: updatedMember.settings.disappearingMessages,
        disappearingMessagesTime: updatedMember.settings.disappearingMessagesTime
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current disappearing message settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    
    // Check if chat exists
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a member of the chat
    const chatMember = await ChatMember.findOne({
      where: { chatId, userId }
    });
    
    if (!chatMember) {
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }
    
    // Get effective settings
    const settings = await disappearingMessagesService.getEffectiveDisappearingSettings(chatId, userId);
    
    res.status(200).json({
      chatSettings: {
        disappearingMessages: chat.settings.disappearingMessages || false,
        disappearingMessagesTime: chat.settings.disappearingMessagesTime || 0
      },
      userSettings: {
        disappearingMessages: chatMember.settings.disappearingMessages,
        disappearingMessagesTime: chatMember.settings.disappearingMessagesTime
      },
      effectiveSettings: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific message as expiring
 */
exports.markMessageAsExpiring = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { timeSeconds } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!timeSeconds || timeSeconds <= 0) {
      return res.status(400).json({ message: 'Valid time in seconds is required' });
    }
    
    // Find the message
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the sender or an admin of the chat
    if (message.senderId !== userId) {
      // Check if user is an admin if it's a group chat
      const chat = await Chat.findByPk(message.chatId);
      
      if (chat.type === 'group') {
        const member = await ChatMember.findOne({
          where: { chatId: message.chatId, userId, role: 'admin' }
        });
        
        if (!member) {
          return res.status(403).json({ message: 'Only the sender or a group administrator can mark a message as expiring' });
        }
      } else {
        return res.status(403).json({ message: 'Only the sender can mark a message as expiring' });
      }
    }
    
    // Mark message as expiring
    const updatedMessage = await disappearingMessagesService.markMessageAsExpiring(messageId, timeSeconds);
    
    res.status(200).json({
      message: 'Message marked as expiring successfully',
      expiresAt: updatedMessage.expiresAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply disappearing message settings to a batch of messages
 */
exports.applyToChatHistory = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { timeSeconds, messageIds } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!timeSeconds || timeSeconds <= 0) {
      return res.status(400).json({ message: 'Valid time in seconds is required' });
    }
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Valid message IDs array is required' });
    }
    
    // Check if chat exists
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // For group chats, check if user is an admin
    if (chat.type === 'group') {
      const member = await ChatMember.findOne({
        where: { chatId, userId, role: 'admin' }
      });
      
      if (!member) {
        return res.status(403).json({ message: 'Only group administrators can apply disappearing messages to chat history' });
      }
    } else {
      // For direct chats, check if user is a participant
      if (chat.user1Id !== userId && chat.user2Id !== userId) {
        return res.status(403).json({ message: 'You are not a participant of this chat' });
      }
    }
    
    // Process each message
    const results = await Promise.all(
      messageIds.map(async (messageId) => {
        try {
          const message = await Message.findOne({
            where: { id: messageId, chatId }
          });
          
          if (!message) {
            return { messageId, success: false, error: 'Message not found or not part of this chat' };
          }
          
          await disappearingMessagesService.markMessageAsExpiring(messageId, timeSeconds);
          return { messageId, success: true };
        } catch (error) {
          return { messageId, success: false, error: error.message };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    
    res.status(200).json({
      message: `Applied disappearing settings to ${successCount} out of ${messageIds.length} messages`,
      results
    });
  } catch (error) {
    next(error);
  }
};