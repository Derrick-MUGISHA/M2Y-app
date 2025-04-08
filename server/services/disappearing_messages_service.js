const { Message, Chat, ChatMember } = require('../models/pg_index');
const { Op } = require('sequelize');
const websocketService = require('./websocket_service');

/**
 * Service to handle disappearing messages
 */

/**
 * Mark a message as expiring
 * @param {string} messageId - Message ID
 * @param {number} timeSeconds - Time until expiry in seconds
 * @returns {Object} - Updated message
 */
async function markMessageAsExpiring(messageId, timeSeconds) {
  try {
    // Find the message
    const message = await Message.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + timeSeconds);
    
    // Update the message
    message.expiresAt = expiresAt;
    await message.save();
    
    // Return the updated message
    return message;
  } catch (error) {
    console.error('Error marking message as expiring:', error);
    throw error;
  }
}

/**
 * Update group chat disappearing message settings
 * @param {string} chatId - Chat ID
 * @param {boolean} enabled - Whether disappearing messages are enabled
 * @param {number} timeSeconds - Time until expiry in seconds
 * @returns {Object} - Updated chat
 */
async function updateChatDisappearingSettings(chatId, enabled, timeSeconds = 0) {
  try {
    // Find the chat
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Update settings
    const updatedSettings = {
      ...chat.settings,
      disappearingMessages: enabled,
      disappearingMessagesTime: timeSeconds
    };
    
    chat.settings = updatedSettings;
    await chat.save();
    
    // Notify all chat members about the settings change
    const chatMembers = await ChatMember.findAll({
      where: { chatId }
    });
    
    const settingsUpdate = {
      type: 'chat_settings_update',
      chatId,
      settings: {
        disappearingMessages: enabled,
        disappearingMessagesTime: timeSeconds
      },
      timestamp: Date.now()
    };
    
    chatMembers.forEach(member => {
      websocketService.sendToUser(member.userId, settingsUpdate);
    });
    
    return chat;
  } catch (error) {
    console.error('Error updating chat disappearing settings:', error);
    throw error;
  }
}

/**
 * Process expiring messages (to be run on a schedule)
 * @returns {number} - Number of messages processed
 */
async function processExpiringMessages() {
  try {
    // Find messages that have expired
    const now = new Date();
    const expiredMessages = await Message.findAll({
      where: {
        expiresAt: {
          [Op.lt]: now
        },
        isDeleted: false
      }
    });
    
    // Process each expired message
    for (const message of expiredMessages) {
      // Mark as deleted
      message.isDeleted = true;
      message.deletedAt = now;
      message.metadata = {
        ...message.metadata,
        expiredAt: now
      };
      
      await message.save();
      
      // Notify chat members
      websocketService.broadcastToChat(message.chatId, {
        type: 'message_expired',
        chatId: message.chatId,
        messageId: message.id,
        timestamp: Date.now()
      });
    }
    
    return expiredMessages.length;
  } catch (error) {
    console.error('Error processing expiring messages:', error);
    throw error;
  }
}

/**
 * Set up user-specific disappearing message settings
 * @param {string} chatId - Chat ID
 * @param {string} userId - User ID
 * @param {boolean} enabled - Whether to enable disappearing messages
 * @param {number} timeSeconds - Time until expiry in seconds
 * @returns {Object} - Updated chat member
 */
async function updateMemberDisappearingSettings(chatId, userId, enabled, timeSeconds = null) {
  try {
    // Find the chat member
    const chatMember = await ChatMember.findOne({
      where: { chatId, userId }
    });
    
    if (!chatMember) {
      throw new Error('Chat member not found');
    }
    
    // Update settings
    chatMember.settings = {
      ...chatMember.settings,
      disappearingMessages: enabled ? true : false,
      disappearingMessagesTime: timeSeconds // Can be null to use chat default
    };
    
    await chatMember.save();
    return chatMember;
  } catch (error) {
    console.error('Error updating member disappearing settings:', error);
    throw error;
  }
}

/**
 * Get the effective disappearing message time for a chat and user
 * @param {string} chatId - Chat ID
 * @param {string} userId - User ID
 * @returns {Object} - Disappearing message settings
 */
async function getEffectiveDisappearingSettings(chatId, userId) {
  try {
    // Get chat settings
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Get member settings
    const chatMember = await ChatMember.findOne({
      where: { chatId, userId }
    });
    
    if (!chatMember) {
      throw new Error('Chat member not found');
    }
    
    // Determine effective settings
    const chatDisappearingEnabled = chat.settings.disappearingMessages || false;
    const chatDisappearingTime = chat.settings.disappearingMessagesTime || 0;
    
    // If member has custom settings
    if (chatMember.settings.disappearingMessages !== null) {
      const memberDisappearingEnabled = chatMember.settings.disappearingMessages;
      const memberDisappearingTime = chatMember.settings.disappearingMessagesTime;
      
      return {
        enabled: memberDisappearingEnabled,
        timeSeconds: memberDisappearingTime !== null ? memberDisappearingTime : chatDisappearingTime,
        isCustom: true
      };
    }
    
    // Use chat settings
    return {
      enabled: chatDisappearingEnabled,
      timeSeconds: chatDisappearingTime,
      isCustom: false
    };
  } catch (error) {
    console.error('Error getting effective disappearing settings:', error);
    throw error;
  }
}

/**
 * Apply disappearing message settings to a new message
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Message ID
 * @returns {boolean} - Whether settings were applied
 */
async function applyDisappearingSettingsToMessage(chatId, messageId) {
  try {
    // Get chat settings
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if disappearing messages are enabled for the chat
    if (!chat.settings.disappearingMessages) {
      return false;
    }
    
    // Get the time
    const timeSeconds = chat.settings.disappearingMessagesTime || 0;
    if (timeSeconds <= 0) {
      return false;
    }
    
    // Apply settings to the message
    await markMessageAsExpiring(messageId, timeSeconds);
    return true;
  } catch (error) {
    console.error('Error applying disappearing settings to message:', error);
    return false;
  }
}

module.exports = {
  markMessageAsExpiring,
  updateChatDisappearingSettings,
  processExpiringMessages,
  updateMemberDisappearingSettings,
  getEffectiveDisappearingSettings,
  applyDisappearingSettingsToMessage
};