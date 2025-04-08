const express = require('express');
const messageReactionController = require('../controllers/message_reaction_controller');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Get emoji picker data
router.get('/emoji-picker', messageReactionController.getEmojiPickerData);

// Get reactions for a specific message
router.get('/message/:messageId', messageReactionController.getMessageReactions);

// Add/remove a reaction to a message
router.post('/message/:messageId', messageReactionController.toggleReaction);

// Get a user's reactions
router.get('/user', messageReactionController.getUserReactions);

// Get popular reactions in a chat
router.get('/popular/:chatId', messageReactionController.getPopularReactions);

module.exports = router;