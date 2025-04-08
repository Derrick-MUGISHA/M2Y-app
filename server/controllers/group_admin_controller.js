const { Chat, ChatMember, GroupAdminControls, User } = require('../models/pg_index');
const { sequelize } = require('../config/database_pg');
const { Op } = require('sequelize');
const websocketService = require('../services/websocket_service');

/**
 * Get admin controls for a group
 */
exports.getGroupAdminControls = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Find the chat
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify this is a group chat
    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'This is not a group chat' });
    }

    // Check if user is a member of the chat
    const member = await ChatMember.findOne({
      where: { chatId, userId }
    });

    if (!member) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get admin controls
    let adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    // If no admin controls exist yet, create default ones
    if (!adminControls) {
      adminControls = await GroupAdminControls.create({ chatId });
    }

    res.status(200).json(adminControls);
  } catch (error) {
    next(error);
  }
};

/**
 * Update group admin controls
 */
exports.updateGroupAdminControls = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // Find the chat
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify this is a group chat
    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'This is not a group chat' });
    }

    // Check if user is an admin of the chat
    const member = await ChatMember.findOne({
      where: { chatId, userId, role: 'admin' }
    });

    if (!member) {
      return res.status(403).json({ message: 'Only group administrators can update group settings' });
    }

    // Get or create admin controls
    let adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls) {
      adminControls = await GroupAdminControls.create({ chatId });
    }

    // Update permissions if provided
    if (updates.permissions) {
      adminControls.permissions = {
        ...adminControls.permissions,
        ...updates.permissions
      };
    }

    // Update message approval settings if provided
    if (updates.messageApproval) {
      adminControls.messageApproval = {
        ...adminControls.messageApproval,
        ...updates.messageApproval
      };
    }

    // Update content moderation settings if provided
    if (updates.contentModeration) {
      adminControls.contentModeration = {
        ...adminControls.contentModeration,
        ...updates.contentModeration
      };
    }

    // Update slow mode settings if provided
    if (updates.slowMode) {
      adminControls.slowMode = {
        ...adminControls.slowMode,
        ...updates.slowMode
      };
    }

    // Update join approval settings if provided
    if (updates.joinApproval) {
      adminControls.joinApproval = {
        ...adminControls.joinApproval,
        ...updates.joinApproval
      };
    }

    await adminControls.save();

    // Notify group members about the settings change
    const members = await ChatMember.findAll({
      where: { chatId }
    });

    const settingsUpdate = {
      type: 'group_settings_update',
      chatId,
      updatedBy: userId,
      settings: {
        adminControls: {
          permissions: adminControls.permissions,
          slowMode: adminControls.slowMode.enabled ? {
            enabled: adminControls.slowMode.enabled,
            intervalSeconds: adminControls.slowMode.intervalSeconds
          } : undefined,
          messageApproval: adminControls.messageApproval.enabled,
          contentModeration: {
            restrictNewMembers: adminControls.contentModeration.restrictNewMembers,
            newMemberRestrictionTime: adminControls.contentModeration.newMemberRestrictionTime
          }
        }
      },
      timestamp: Date.now()
    };

    // Broadcast to all group members
    members.forEach(member => {
      websocketService.sendToUser(member.userId, settingsUpdate);
    });

    res.status(200).json(adminControls);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending message
 */
exports.approveMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.userId;

    // Check if user is an admin
    const member = await ChatMember.findOne({
      where: { chatId, userId, role: 'admin' }
    });

    if (!member) {
      return res.status(403).json({ message: 'Only group administrators can approve messages' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls || !adminControls.messageApproval.enabled) {
      return res.status(400).json({ message: 'Message approval is not enabled for this group' });
    }

    // Check if the message is pending approval
    const pendingMessages = adminControls.messageApproval.pendingMessages || [];
    if (!pendingMessages.includes(messageId)) {
      return res.status(404).json({ message: 'Message not found or already approved' });
    }

    // Remove message from pending list
    adminControls.messageApproval.pendingMessages = pendingMessages.filter(id => id !== messageId);
    await adminControls.save();

    // Update message status in database
    const message = await Message.findByPk(messageId);
    if (message) {
      message.metadata = {
        ...message.metadata,
        approved: true,
        approvedBy: userId,
        approvedAt: new Date()
      };
      await message.save();

      // Notify group members about the approved message
      websocketService.broadcastToChat(chatId, {
        type: 'message_approved',
        chatId,
        messageId,
        approvedBy: userId,
        timestamp: Date.now()
      });
    }

    res.status(200).json({ message: 'Message approved successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending message
 */
exports.rejectMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.userId;

    // Check if user is an admin
    const member = await ChatMember.findOne({
      where: { chatId, userId, role: 'admin' }
    });

    if (!member) {
      return res.status(403).json({ message: 'Only group administrators can reject messages' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls || !adminControls.messageApproval.enabled) {
      return res.status(400).json({ message: 'Message approval is not enabled for this group' });
    }

    // Check if the message is pending approval
    const pendingMessages = adminControls.messageApproval.pendingMessages || [];
    if (!pendingMessages.includes(messageId)) {
      return res.status(404).json({ message: 'Message not found or already processed' });
    }

    // Remove message from pending list
    adminControls.messageApproval.pendingMessages = pendingMessages.filter(id => id !== messageId);
    await adminControls.save();

    // Soft delete the message
    const message = await Message.findByPk(messageId);
    if (message) {
      message.isDeleted = true;
      message.metadata = {
        ...message.metadata,
        rejected: true,
        rejectedBy: userId,
        rejectedAt: new Date()
      };
      await message.save();

      // Notify the sender about the rejected message
      websocketService.sendToUser(message.senderId, {
        type: 'message_rejected',
        chatId,
        messageId,
        rejectedBy: userId,
        timestamp: Date.now()
      });
    }

    res.status(200).json({ message: 'Message rejected successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending member join request
 */
exports.approveMemberJoin = async (req, res, next) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const adminUserId = req.user.userId;

    // Check if the admin user is an admin of the group
    const adminMember = await ChatMember.findOne({
      where: { chatId, userId: adminUserId, role: 'admin' }
    });

    if (!adminMember) {
      return res.status(403).json({ message: 'Only group administrators can approve join requests' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls || !adminControls.joinApproval.enabled) {
      return res.status(400).json({ message: 'Join approval is not enabled for this group' });
    }

    // Check if the user is in the pending list
    const pendingMembers = adminControls.joinApproval.pendingMembers || [];
    if (!pendingMembers.includes(targetUserId)) {
      return res.status(404).json({ message: 'User not found in pending list' });
    }

    // Remove user from pending list
    adminControls.joinApproval.pendingMembers = pendingMembers.filter(id => id !== targetUserId);
    await adminControls.save();

    // Check if user exists
    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add user to the group
    await ChatMember.create({
      chatId,
      userId: targetUserId,
      role: 'member',
      joinedAt: new Date()
    });

    // Get chat info
    const chat = await Chat.findByPk(chatId);

    // Notify the user they've been approved
    websocketService.sendToUser(targetUserId, {
      type: 'join_request_approved',
      chatId,
      chatName: chat.name,
      approvedBy: adminUserId,
      timestamp: Date.now()
    });

    // Notify group members about the new user
    websocketService.broadcastToChat(chatId, {
      type: 'member_joined',
      chatId,
      userId: targetUserId,
      approvedBy: adminUserId,
      timestamp: Date.now()
    });

    res.status(200).json({ message: 'Join request approved successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending member join request
 */
exports.rejectMemberJoin = async (req, res, next) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const adminUserId = req.user.userId;

    // Check if the admin user is an admin of the group
    const adminMember = await ChatMember.findOne({
      where: { chatId, userId: adminUserId, role: 'admin' }
    });

    if (!adminMember) {
      return res.status(403).json({ message: 'Only group administrators can reject join requests' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls || !adminControls.joinApproval.enabled) {
      return res.status(400).json({ message: 'Join approval is not enabled for this group' });
    }

    // Check if the user is in the pending list
    const pendingMembers = adminControls.joinApproval.pendingMembers || [];
    if (!pendingMembers.includes(targetUserId)) {
      return res.status(404).json({ message: 'User not found in pending list' });
    }

    // Remove user from pending list
    adminControls.joinApproval.pendingMembers = pendingMembers.filter(id => id !== targetUserId);
    await adminControls.save();

    // Notify the user they've been rejected
    websocketService.sendToUser(targetUserId, {
      type: 'join_request_rejected',
      chatId,
      rejectedBy: adminUserId,
      timestamp: Date.now()
    });

    res.status(200).json({ message: 'Join request rejected successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update member role (promote to admin or demote to member)
 */
exports.updateMemberRole = async (req, res, next) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const { role } = req.body; // 'admin' or 'member'
    const adminUserId = req.user.userId;

    // Validate role
    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "member"' });
    }

    // Check if the admin user is an admin of the group
    const adminMember = await ChatMember.findOne({
      where: { chatId, userId: adminUserId, role: 'admin' }
    });

    if (!adminMember) {
      return res.status(403).json({ message: 'Only group administrators can update member roles' });
    }

    // Find the target member
    const targetMember = await ChatMember.findOne({
      where: { chatId, userId: targetUserId }
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    // Check if attempting to demote the last admin
    if (targetMember.role === 'admin' && role === 'member') {
      const adminCount = await ChatMember.count({
        where: { chatId, role: 'admin' }
      });

      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin of the group' });
      }
    }

    // Update the member's role
    targetMember.role = role;
    await targetMember.save();

    // Notify the group members about the role change
    const actionType = role === 'admin' ? 'member_promoted' : 'member_demoted';
    websocketService.broadcastToChat(chatId, {
      type: actionType,
      chatId,
      userId: targetUserId,
      updatedBy: adminUserId,
      newRole: role,
      timestamp: Date.now()
    });

    res.status(200).json({
      message: `Member ${role === 'admin' ? 'promoted to admin' : 'demoted to member'} successfully`,
      member: targetMember
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending join requests
 */
exports.getPendingJoinRequests = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Check if user is an admin of the group
    const member = await ChatMember.findOne({
      where: { chatId, userId, role: 'admin' }
    });

    if (!member) {
      return res.status(403).json({ message: 'Only group administrators can view pending join requests' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls) {
      return res.status(404).json({ message: 'Group admin controls not found' });
    }

    const pendingMemberIds = adminControls.joinApproval.pendingMembers || [];

    // Get user details for pending members
    const pendingMembers = await User.findAll({
      where: { id: pendingMemberIds },
      attributes: ['id', 'phoneNumber', 'nickname', 'profilePicture']
    });

    res.status(200).json(pendingMembers);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending messages for approval
 */
exports.getPendingMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Check if user is an admin of the group
    const member = await ChatMember.findOne({
      where: { chatId, userId, role: 'admin' }
    });

    if (!member) {
      return res.status(403).json({ message: 'Only group administrators can view pending messages' });
    }

    // Get admin controls
    const adminControls = await GroupAdminControls.findOne({
      where: { chatId }
    });

    if (!adminControls || !adminControls.messageApproval.enabled) {
      return res.status(400).json({ message: 'Message approval is not enabled for this group' });
    }

    const pendingMessageIds = adminControls.messageApproval.pendingMessages || [];

    // Get message details for pending messages
    const pendingMessages = await Message.findAll({
      where: { id: pendingMessageIds },
      include: [{
        model: User,
        as: 'Sender',
        attributes: ['id', 'phoneNumber', 'nickname', 'profilePicture']
      }]
    });

    res.status(200).json(pendingMessages);
  } catch (error) {
    next(error);
  }
};