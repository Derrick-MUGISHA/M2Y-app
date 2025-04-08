const User = require('../models/user');
const Chat = require('../models/chat');

/**
 * Get user profile by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user info without sensitive data
    res.status(200).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      profileImage: user.profileImage,
      status: user.status,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      createdAt: user.createdAt,
      publicKey: user.publicKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contacts (other app users that the current user has chatted with)
 */
exports.getContacts = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: userId,
      isGroup: false
    });
    
    // Extract unique user IDs from chat participants
    const contactIds = new Set();
    
    chats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== userId) {
          contactIds.add(participantId.toString());
        }
      });
    });
    
    // Find all users by IDs
    const contacts = await User.find({
      _id: { $in: Array.from(contactIds) }
    }).select('phoneNumber nickname profileImage status lastSeen isOnline publicKey createdAt');
    
    res.status(200).json(contacts);
  } catch (error) {
    next(error);
  }
};

/**
 * Search for users by phone number or nickname
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;
    
    if (!q || q.length < 3) {
      return res.status(400).json({ message: 'Search query must be at least 3 characters' });
    }
    
    // Find users matching the query
    const users = await User.find({
      $and: [
        { _id: { $ne: userId } }, // Exclude current user
        {
          $or: [
            { phoneNumber: { $regex: q, $options: 'i' } },
            { nickname: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('phoneNumber nickname profileImage status lastSeen isOnline publicKey createdAt')
    .limit(20);
    
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * Block a user
 */
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if user to block exists
    const userToBlock = await User.findById(userId);
    
    if (!userToBlock) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find current user
    const currentUser = await User.findById(currentUserId);
    
    // Check if user is already blocked
    if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is already blocked' });
    }
    
    // Add to blocked users
    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }
    
    currentUser.blockedUsers.push(userId);
    await currentUser.save();
    
    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Unblock a user
 */
exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find current user
    const currentUser = await User.findById(currentUserId);
    
    // Check if user is blocked
    if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is not blocked' });
    }
    
    // Remove from blocked users
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      blockedId => blockedId.toString() !== userId
    );
    
    await currentUser.save();
    
    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blocked users
 */
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Find current user with blocked users populated
    const user = await User.findById(userId)
      .populate('blockedUsers', 'phoneNumber nickname profileImage');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user chats
 */
exports.getUserChats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    // Calculate unread counts for each chat
    const chatsWithUnread = chats.map(chat => {
      const unreadCount = chat.getUnreadCountForUser(userId);
      
      return {
        ...chat.toJSON(),
        unreadCount
      };
    });
    
    res.status(200).json(chatsWithUnread);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new chat with a user
 */
exports.createChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.userId;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, userId], $size: 2 }
    })
    .populate('participants', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey')
    .populate('lastMessage');
    
    if (existingChat) {
      return res.status(200).json({
        ...existingChat.toJSON(),
        unreadCount: existingChat.getUnreadCountForUser(currentUserId)
      });
    }
    
    // Create a new chat
    const chat = new Chat({
      participants: [currentUserId, userId],
      isGroup: false,
      createdBy: currentUserId,
      unreadCounts: [
        { userId: currentUserId, count: 0 },
        { userId, count: 0 }
      ]
    });
    
    await chat.save();
    
    // Populate participants
    await chat.populate('participants', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(201).json({
      ...chat.toJSON(),
      unreadCount: 0
    });
  } catch (error) {
    next(error);
  }
};
