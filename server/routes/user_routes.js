const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { authenticate } = require('../middleware/auth_middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get user profile by ID
router.get('/:userId', userController.getUserById);

// Get contacts (other app users that the current user has chatted with)
router.get('/contacts', userController.getContacts);

// Search for users by phone number or nickname
router.get('/search', userController.searchUsers);

// Block a user
router.post('/block/:userId', userController.blockUser);

// Unblock a user
router.delete('/block/:userId', userController.unblockUser);

// Get blocked users
router.get('/blocked', userController.getBlockedUsers);

// Get user chats
router.get('/chats', userController.getUserChats);

// Create a new chat with a user
router.post('/chats', userController.createChat);

module.exports = router;
