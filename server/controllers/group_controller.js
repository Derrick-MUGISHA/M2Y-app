const Group = require('../models/group');
const Chat = require('../models/chat');
const User = require('../models/user');
const mongoose = require('mongoose');

/**
 * Create a new group
 */
exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, image, memberIds, isPrivate, allowAnonymousMessages, messageExpiryTime } = req.body;
    const createdBy = req.user.userId;
    
    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'At least one member is required' });
    }
    
    // Create a new chat for the group
    const chat = new Chat({
      participants: [createdBy, ...memberIds].filter((id, index, self) => 
        self.indexOf(id) === index // Remove duplicates
      ),
      isGroup: true,
      name,
      createdBy,
      unreadCounts: [
        { userId: createdBy, count: 0 },
        ...[...new Set(memberIds)].map(userId => ({ userId, count: 0 })) // Remove duplicates
      ]
    });
    
    await chat.save();
    
    // Create the group
    const group = new Group({
      name,
      description,
      image,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      allowAnonymousMessages: allowAnonymousMessages || false,
      messageExpiryTime,
      createdBy,
      chatId: chat._id,
      members: [
        {
          user: createdBy,
          role: 'admin',
          isVisible: true,
          joinedAt: new Date()
        },
        ...memberIds.map(userId => ({
          user: userId,
          role: 'member',
          isVisible: true,
          joinedAt: new Date()
        }))
      ]
    });
    
    await group.save();
    
    // Update chat with group ID reference
    chat.groupId = group._id;
    await chat.save();
    
    // Populate members
    await group.populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all groups for the current user
 */
exports.getGroups = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Find all groups where the user is a member
    const groups = await Group.find({
      'members.user': userId
    })
    .populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey');
    
    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific group
 */
exports.getGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    
    // Find the group
    const group = await Group.findById(groupId)
      .populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if the user is a member
    if (!group.isMember(userId)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }
    
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * Update group settings
 */
exports.updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, image, isPrivate, allowAnonymousMessages, messageExpiryTime } = req.body;
    const userId = req.user.userId;
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if the user is an admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ message: 'Only group administrators can update group settings' });
    }
    
    // Update fields if provided
    if (name) {
      group.name = name;
      
      // Also update the chat name
      await Chat.findByIdAndUpdate(group.chatId, { name });
    }
    
    if (description !== undefined) {
      group.description = description;
    }
    
    if (image !== undefined) {
      group.image = image;
    }
    
    if (isPrivate !== undefined) {
      group.isPrivate = isPrivate;
    }
    
    if (allowAnonymousMessages !== undefined) {
      group.allowAnonymousMessages = allowAnonymousMessages;
    }
    
    if (messageExpiryTime !== undefined) {
      group.messageExpiryTime = messageExpiryTime;
    }
    
    group.updatedAt = new Date();
    await group.save();
    
    // Populate members before returning
    await group.populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a member to a group
 */
exports.addGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId, nickname, isVisible, isAdmin } = req.body;
    const currentUserId = req.user.userId;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if the current user is an admin
    if (!group.isAdmin(currentUserId)) {
      return res.status(403).json({ message: 'Only group administrators can add members' });
    }
    
    // Check if the user to add exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already a member
    if (group.isMember(userId)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }
    
    // Add the user to the group
    await group.addMember(userId, {
      nickname,
      isVisible: isVisible !== undefined ? isVisible : true,
      isAdmin: isAdmin || false
    });
    
    // Add the user to the chat participants
    const chat = await Chat.findById(group.chatId);
    
    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
      chat.unreadCounts.push({ userId, count: 0 });
      await chat.save();
    }
    
    // Populate members before returning
    await group.populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a group member's settings
 */
exports.updateGroupMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const { nickname, isVisible, isAdmin } = req.body;
    const currentUserId = req.user.userId;
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if the current user is an admin
    if (!group.isAdmin(currentUserId)) {
      return res.status(403).json({ message: 'Only group administrators can update member settings' });
    }
    
    // Check if the member exists in the group
    if (!group.isMember(memberId)) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }
    
    // Update the member's settings
    await group.updateMember(memberId, {
      nickname,
      isVisible,
      role: isAdmin ? 'admin' : 'member'
    });
    
    // Populate members before returning
    await group.populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a member from a group
 */
exports.removeGroupMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const currentUserId = req.user.userId;
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // A user can remove themselves (leave the group) or an admin can remove anyone
    if (memberId !== currentUserId && !group.isAdmin(currentUserId)) {
      return res.status(403).json({ message: 'Only group administrators can remove members' });
    }
    
    // Check if the member exists in the group
    if (!group.isMember(memberId)) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }
    
    // Prevent removing the last admin
    if (
      group.isAdmin(memberId) &&
      group.members.filter(m => m.role === 'admin').length === 1
    ) {
      // If it's the last admin and they're trying to leave, make another member an admin
      if (memberId === currentUserId) {
        const otherMember = group.members.find(m => m.user.toString() !== currentUserId);
        
        if (otherMember) {
          await group.updateMember(otherMember.user, { role: 'admin' });
        } else {
          // If there are no other members, delete the group
          await Group.findByIdAndDelete(groupId);
          await Chat.findByIdAndDelete(group.chatId);
          
          return res.status(200).json({ message: 'Group deleted as you were the last member' });
        }
      } else {
        return res.status(400).json({ message: 'Cannot remove the last admin from the group' });
      }
    }
    
    // Remove the member from the group
    await group.removeMember(memberId);
    
    // If the group has no more members, delete it
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      await Chat.findByIdAndDelete(group.chatId);
      
      return res.status(200).json({ message: 'Group deleted as there are no more members' });
    }
    
    // Remove the user from the chat participants
    await Chat.findByIdAndUpdate(group.chatId, {
      $pull: { 
        participants: memberId,
        unreadCounts: { userId: memberId }
      }
    });
    
    // Populate members before returning
    await group.populate('members.user', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
    
    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};