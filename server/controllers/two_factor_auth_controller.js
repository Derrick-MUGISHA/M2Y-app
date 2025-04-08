const { User } = require('../models/pg_index');
const twoFactorAuthService = require('../services/two_factor_auth_service');

/**
 * Get 2FA status for the current user
 */
exports.getStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Get the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return the 2FA status (without secrets)
    res.status(200).json({
      enabled: user.twoFactorAuth.enabled || false,
      method: user.twoFactorAuth.method || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start the setup process for app-based 2FA (TOTP)
 */
exports.setupTOTP = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Generate a new TOTP secret
    const secretData = await twoFactorAuthService.generateTOTPSecret(userId);
    
    // Generate a QR code for the secret
    const qrCodeUrl = await twoFactorAuthService.generateQRCode(secretData.otpauth_url);
    
    // Return the secret and QR code
    res.status(200).json({
      secret: secretData.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secretData.otpauth_url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and enable app-based 2FA (TOTP)
 */
exports.verifyAndEnableTOTP = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { token, secret } = req.body;
    
    // Validate input
    if (!token || !secret) {
      return res.status(400).json({ message: 'Token and secret are required' });
    }
    
    // Enable TOTP
    await twoFactorAuthService.enableTOTP(userId, token, secret);
    
    // Get the backup codes
    const backupCodes = await twoFactorAuthService.getBackupCodes(userId);
    
    res.status(200).json({
      message: 'Two-factor authentication enabled successfully',
      backupCodes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start the setup process for SMS-based 2FA
 */
exports.setupSMS = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Start the SMS 2FA setup process
    const { verificationId } = await twoFactorAuthService.enableSMSTwoFactor(userId);
    
    res.status(200).json({
      message: 'Verification code sent successfully',
      verificationId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and enable SMS-based 2FA
 */
exports.verifyAndEnableSMS = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { verificationId, code } = req.body;
    
    // Validate input
    if (!verificationId || !code) {
      return res.status(400).json({ message: 'Verification ID and code are required' });
    }
    
    // Verify and enable SMS 2FA
    await twoFactorAuthService.verifySMSTwoFactorSetup(userId, verificationId, code);
    
    // Get the backup codes
    const backupCodes = await twoFactorAuthService.getBackupCodes(userId);
    
    res.status(200).json({
      message: 'Two-factor authentication enabled successfully',
      backupCodes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send 2FA verification code for login
 */
exports.sendLoginVerificationCode = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Send verification code
    const { verificationId } = await twoFactorAuthService.sendLoginVerificationCode(userId);
    
    res.status(200).json({
      message: 'Verification code sent successfully',
      verificationId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA during login
 */
exports.verifyLogin = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    
    // Validate input
    if (!userId || !code) {
      return res.status(400).json({ message: 'User ID and verification code are required' });
    }
    
    // Verify the code
    const isValid = await twoFactorAuthService.verifyTwoFactorLogin(userId, code);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }
    
    res.status(200).json({
      message: 'Two-factor authentication verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable 2FA
 */
exports.disable = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { verificationCode } = req.body;
    
    // Validate input
    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    
    // Disable 2FA
    await twoFactorAuthService.disableTwoFactor(userId, verificationCode);
    
    res.status(200).json({
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get backup codes
 */
exports.getBackupCodes = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Get backup codes
    const backupCodes = await twoFactorAuthService.getBackupCodes(userId);
    
    res.status(200).json({
      backupCodes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate backup codes
 */
exports.regenerateBackupCodes = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { verificationCode } = req.body;
    
    // Validate input
    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    
    // Verify the user first
    const isValid = await twoFactorAuthService.verifyTwoFactorLogin(userId, verificationCode);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }
    
    // Regenerate backup codes
    const newBackupCodes = await twoFactorAuthService.regenerateBackupCodes(userId);
    
    res.status(200).json({
      message: 'Backup codes regenerated successfully',
      backupCodes: newBackupCodes
    });
  } catch (error) {
    next(error);
  }
};