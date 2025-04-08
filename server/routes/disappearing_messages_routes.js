const express = require('express');
const disappearingMessagesController = require('../controllers/disappearing_messages_controller');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Chat-level settings
router.get('/chat/:chatId', disappearingMessagesController.getSettings);
router.put('/chat/:chatId', disappearingMessagesController.updateChatSettings);

// User-specific settings
router.put('/user/:chatId', disappearingMessagesController.updateUserSettings);

// Message-specific expiry
router.post('/message/:messageId', disappearingMessagesController.markMessageAsExpiring);

// Batch apply to chat history
router.post('/chat/:chatId/batch', disappearingMessagesController.applyToChatHistory);

module.exports = router;