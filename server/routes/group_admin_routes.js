const express = require('express');
const groupAdminController = require('../controllers/group_admin_controller');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Get group admin controls
router.get('/:chatId', groupAdminController.getGroupAdminControls);

// Update group admin controls
router.put('/:chatId', groupAdminController.updateGroupAdminControls);

// Message approval
router.post('/:chatId/messages/:messageId/approve', groupAdminController.approveMessage);
router.post('/:chatId/messages/:messageId/reject', groupAdminController.rejectMessage);
router.get('/:chatId/messages/pending', groupAdminController.getPendingMessages);

// Member join approvals
router.post('/:chatId/join-requests/:userId/approve', groupAdminController.approveMemberJoin);
router.post('/:chatId/join-requests/:userId/reject', groupAdminController.rejectMemberJoin);
router.get('/:chatId/join-requests', groupAdminController.getPendingJoinRequests);

// Role management
router.put('/:chatId/members/:userId/role', groupAdminController.updateMemberRole);

module.exports = router;