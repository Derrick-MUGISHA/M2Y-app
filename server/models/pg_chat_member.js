const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database_pg');

const ChatMember = sequelize.define('ChatMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  chatId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Chats',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true // Custom nickname in this group
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // User-specific settings for this chat
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      muted: false,
      pinnedChat: false,
      customNotificationSound: null,
      disappearingMessages: null, // Inherits from group settings if null
    }
  },
  lastReadMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    // For checking if a user is in a chat
    {
      unique: true,
      fields: ['chatId', 'userId']
    },
    // For finding all members of a chat
    {
      fields: ['chatId']
    },
    // For finding all chats a user is a member of
    {
      fields: ['userId']
    }
  ]
});

module.exports = ChatMember;