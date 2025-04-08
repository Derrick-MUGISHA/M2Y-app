const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group_controller');
const { authenticate, isGroupAdmin, isGroupMember } = require('../middleware/auth_middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new group
router.post('/', groupController.createGroup);

// Get all groups for the current user
router.get('/', groupController.getGroups);

// Get a specific group
router.get('/:groupId', isGroupMember, groupController.getGroup);

// Update group settings
router.put('/:groupId', isGroupAdmin, groupController.updateGroup);

// Add a member to a group
router.post('/:groupId/members', isGroupAdmin, groupController.addGroupMember);

// Update a group member's settings
router.put('/:groupId/members/:memberId', isGroupAdmin, groupController.updateGroupMember);

// Remove a member from a group
router.delete('/:groupId/members/:memberId', groupController.removeGroupMember);

module.exports = router;
