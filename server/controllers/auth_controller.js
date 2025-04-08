const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendSMS } = require('../services/notification_service');

// Secret for JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Send OTP to user's phone number
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Find or create user
    let user = await User.findOne({ phoneNumber });

    if (user) {
      // Update existing user with new OTP
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    } else {
      // Create new user
      user = new User({
        phoneNumber,
        otp,
        otpExpiry,
      });
    }

    await user.save();

    // Send OTP via SMS
    await sendSMS(
      phoneNumber,
      `Your M2You verification code is: ${otp}. This code will expire in 10 minutes.`
    );

    return res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and generate JWT token
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp, publicKey } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP is valid and not expired
    if (user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(401).json({ message: 'OTP has expired' });
    }

    // Update user's public key if provided
    if (publicKey) {
      user.publicKey = publicKey;
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpiry = null;
    user.lastSeen = new Date();
    user.isOnline = true;

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: '30d' } // Token valid for 30 days
    );

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        nickname: user.nickname,
        profileImage: user.profileImage,
        status: user.status,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        isOnline: user.isOnline,
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { nickname, status, profileImage } = req.body;
    const userId = req.user.userId;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user profile
    if (nickname !== undefined) {
      user.nickname = nickname;
    }

    if (status !== undefined) {
      user.status = status;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    return res.status(200).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      profileImage: user.profileImage,
      status: user.status,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      publicKey: user.publicKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      profileImage: user.profileImage,
      status: user.status,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      publicKey: user.publicKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Update user's online status
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};