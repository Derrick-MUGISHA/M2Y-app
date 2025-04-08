const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message_controller');
const { authenticate } = require('../middleware/auth_middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Send a message
router.post('/', messageController.sendMessage);

// Get messages for a chat
router.get('/chat/:chatId', messageController.getChatMessages);

// Delete a message
router.delete('/:messageId', messageController.deleteMessage);

// Update message status (read, delivered)
router.patch('/:messageId/status', messageController.updateMessageStatus);

module.exports = router;
