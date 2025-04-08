const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database_pg');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^\+[1-9]\d{1,14}$/ // E.164 format
    }
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profilePicture: {
    type: DataTypes.STRING, // URL to profile picture
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // Custom status message
    allowNull: true
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // User's devices for multi-device support
  devices: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  // For two-factor authentication
  twoFactorAuth: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      method: null, // 'sms', 'app', etc.
      secret: null
    }
  },
  // For end-to-end encryption
  publicKeys: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  // User privacy settings
  privacySettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      lastSeen: 'everyone', // 'everyone', 'contacts', 'nobody'
      profilePhoto: 'everyone', // 'everyone', 'contacts', 'nobody'
      status: 'everyone', // 'everyone', 'contacts', 'nobody'
      readReceipts: true,
      groups: 'everyone' // 'everyone', 'contacts', 'nobody'
    }
  },
  // For notifications
  notificationSettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      messageNotifications: true,
      groupNotifications: true,
      callNotifications: true,
      vibrate: true,
      sound: 'default'
    }
  },
  // For blocks
  blockedUsers: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  // Account status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // For account deletion
  deletionScheduled: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true, // For soft deletes
  indexes: [
    // For phone number searches
    {
      unique: true,
      fields: ['phoneNumber']
    },
    // For nickname searches (case-insensitive)
    {
      fields: [sequelize.fn('lower', sequelize.col('nickname'))]
    }
  ]
});

module.exports = User;