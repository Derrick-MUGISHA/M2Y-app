const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database_pg');

const Message = sequelize.define('Message', {
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
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'system'),
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // For media messages
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // For end-to-end encryption
  encryptionInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  // For disappearing messages
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Message status tracking
  deliveredTo: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  readBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  // For replies
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  // For forwarded messages
  forwardedFrom: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  // For edited messages
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  originalContent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Message metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // For system messages (e.g., "User X joined the group")
  systemMessageType: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    // For retrieving messages in a chat
    {
      fields: ['chatId', 'createdAt']
    },
    // For finding messages from a specific sender
    {
      fields: ['senderId']
    },
    // For finding replies to a message
    {
      fields: ['replyToId']
    },
    // For finding expiring messages
    {
      fields: ['expiresAt'],
      where: {
        expiresAt: { [Op.ne]: null }
      }
    }
  ]
});

module.exports = Message;