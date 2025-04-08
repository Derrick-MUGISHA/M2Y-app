const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Secret for JWT token
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to authenticate user via JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        message: 'Authentication token is missing',
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user data to the request
    req.user = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
    };
    
    // Update user's last seen time
    await User.findByIdAndUpdate(
      decoded.userId,
      { lastSeen: new Date() }
    );
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid authentication token',
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Authentication token has expired',
      });
    }
    
    next(error);
  }
};

/**
 * Middleware to check if the user is a group admin
 */
exports.isGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    
    // Import Group model here to avoid circular dependency
    const Group = require('../models/group');
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        message: 'Group not found',
      });
    }
    
    // Check if the user is an admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({
        message: 'Only group administrators can perform this action',
      });
    }
    
    // Add group to the request
    req.group = group;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if the user is a group member
 */
exports.isGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    
    // Import Group model here to avoid circular dependency
    const Group = require('../models/group');
    
    // Find the group
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        message: 'Group not found',
      });
    }
    
    // Check if the user is a member
    if (!group.isMember(userId)) {
      return res.status(403).json({
        message: 'You are not a member of this group',
      });
    }
    
    // Add group to the request
    req.group = group;
    
    next();
  } catch (error) {
    next(error);
  }
};