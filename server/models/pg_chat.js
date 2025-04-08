const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database_pg');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('direct', 'group'),
    allowNull: false
  },
  // For direct chats (unused for group chats)
  user1Id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  user2Id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // For group chats
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profilePicture: {
    type: DataTypes.STRING, // URL to group picture
    allowNull: true
  },
  // Group settings and permissions
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      onlyAdminsCanSend: false,
      onlyAdminsCanEditInfo: true,
      disappearingMessages: false,
      disappearingMessagesTime: 0, // in seconds, 0 means disabled
    }
  },
  // For encryption in groups
  encryptionInfo: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  // Last activity in the chat (for sorting)
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  // For pinned chats - we'll store user-specific pinned status in ChatMember
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // For archived chats - we'll store user-specific archived status in ChatMember
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // For deleted chats
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    // For finding direct chats between two users
    {
      fields: ['type', 'user1Id', 'user2Id'],
      where: { type: 'direct' }
    },
    // For finding all direct chats for a user
    {
      fields: ['type', 'user1Id'],
      where: { type: 'direct' }
    },
    {
      fields: ['type', 'user2Id'],
      where: { type: 'direct' }
    },
    // For finding group chats by name (case-insensitive, for search)
    {
      fields: [sequelize.fn('lower', sequelize.col('name'))],
      where: { type: 'group' }
    },
    // For sorting by last activity
    {
      fields: ['lastActivity']
    }
  ]
});

module.exports = Chat;