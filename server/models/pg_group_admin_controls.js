const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database_pg');

// This model extends the chat functionality with advanced group admin controls
const GroupAdminControls = sequelize.define('GroupAdminControls', {
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
    },
    unique: true
  },
  // Advanced group admin controls
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {
      // Who can edit group info
      editGroupInfo: 'admins', // 'admins', 'all_members'
      
      // Who can send messages
      sendMessages: 'all_members', // 'admins', 'all_members'
      
      // Who can add members
      addMembers: 'admins', // 'admins', 'all_members'
      
      // Who can see member list
      seeMembers: 'all_members', // 'admins', 'all_members'
      
      // Who can remove members
      removeMembers: 'admins',  // 'admins', 'all_members'
      
      // Who can promote members to admin
      promoteMembers: 'admins', // 'admins'

      // Who can see past messages when joining
      seePastMessages: 'all_members', // 'admins', 'all_members', 'none'
      
      // Who can react to messages
      reactToMessages: 'all_members', // 'admins', 'all_members', 'none'
      
      // Who can forward messages from this group
      forwardMessages: 'all_members', // 'admins', 'all_members', 'none'
      
      // Who can delete messages
      deleteMessages: 'own', // 'own', 'admins_all', 'all_members_all'
      
      // Who can mention all users with @all
      mentionAll: 'admins', // 'admins', 'all_members'
    }
  },
  // For message approval workflow if enabled
  messageApproval: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      requireApprovalFor: 'none', // 'none', 'new_members', 'all_members'
      automaticApprovalAfter: 10, // Number of approved messages after which approval is no longer required
      pendingMessages: [] // Array of pending message IDs that require approval
    }
  },
  // Additional anti-spam and content moderation settings
  contentModeration: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      restrictNewMembers: true, // Restrict new members from posting for a period 
      newMemberRestrictionTime: 24, // Hours before new members can post
      blockUrls: false, // Block messages containing URLs
      blockForwards: false, // Block forwarded messages
      sensitiveContentFilter: 'off', // 'off', 'low', 'medium', 'high'
      bannedKeywords: [] // List of banned keywords/phrases
    }
  },
  // For slow mode, limiting how often members can send messages
  slowMode: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      intervalSeconds: 0, // Seconds between allowed messages (0 = disabled)
      exemptAdmins: true // Whether admins are exempt from slow mode
    }
  },
  joinApproval: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      requireApproval: false, // Whether new members need approval to join
      pendingMembers: [], // Array of user IDs pending approval
      inviteLinks: [] // Array of active invite links with settings
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['chatId']
    }
  ]
});

module.exports = GroupAdminControls;