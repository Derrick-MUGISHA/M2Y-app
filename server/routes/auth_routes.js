const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const { authenticate } = require('../middleware/auth_middleware');

// Send OTP to phone number
router.post('/send-otp', authController.sendOtp);

// Verify OTP and generate JWT token
router.post('/verify-otp', authController.verifyOtp);

// Update user profile (protected route)
router.put('/profile', authenticate, authController.updateProfile);

// Get current user profile (protected route)
router.get('/profile', authenticate, authController.getProfile);

// Logout user (protected route)
router.post('/logout', authenticate, authController.logout);

module.exports = router;
