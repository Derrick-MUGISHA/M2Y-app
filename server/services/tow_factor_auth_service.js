const crypto = require('crypto');
const { User } = require('../models/pg_index');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Service to handle two-factor authentication
 */

/**
 * Generate a new TOTP (Time-based One-Time Password) secret for a user
 * @param {string} userId - User ID
 * @returns {Object} - Object containing the secret and other details
 */
async function generateTOTPSecret(userId) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a new secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `M2You:${user.phoneNumber}`,
      issuer: 'M2You Messenger'
    });

    // Return the secret information
    return {
      otpauth_url: secret.otpauth_url,
      base32: secret.base32,
      // Don't expose the hex secret in responses
      hex: null
    };
  } catch (error) {
    console.error('Error generating TOTP secret:', error);
    throw error;
  }
}

/**
 * Generate a QR code for the TOTP secret
 * @param {string} otpauthUrl - The otpauth URL
 * @returns {string} - The QR code as a data URL
 */
async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Verify a TOTP token
 * @param {string} token - The token to verify
 * @param {string} secret - The secret to use for verification
 * @returns {boolean} - Whether the token is valid
 */
function verifyTOTP(token, secret) {
  try {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 1 time step before and after the current time
    });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return false;
  }
}

/**
 * Enable TOTP for a user
 * @param {string} userId - User ID
 * @param {string} token - Verification token
 * @param {string} secret - Secret to store
 * @returns {boolean} - Whether the operation was successful
 */
async function enableTOTP(userId, token, secret) {
  try {
    // Verify the token first
    const isValid = verifyTOTP(token, secret);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Enable 2FA for the user
    user.twoFactorAuth = {
      enabled: true,
      method: 'totp',
      secret: secret,
      backupCodes: generateBackupCodes()
    };

    await user.save();
    return true;
  } catch (error) {
    console.error('Error enabling TOTP:', error);
    throw error;
  }
}

/**
 * Generate backup codes for 2FA recovery
 * @returns {Array} - Array of backup codes
 */
function generateBackupCodes() {
  const backupCodes = [];
  for (let i = 0; i < 10; i++) {
    // Generate a random 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex');
    backupCodes.push(code);
  }
  return backupCodes;
}

/**
 * Send SMS verification code
 * @param {string} phoneNumber - Phone number to send code to
 * @param {string} code - Verification code
 * @returns {boolean} - Whether the operation was successful
 */
async function sendSMSVerificationCode(phoneNumber, code) {
  try {
    // In a real implementation, this would use Twilio or another SMS provider
    console.log(`[SMS] Sending verification code ${code} to ${phoneNumber}`);
    
    // Placeholder for actual SMS sending logic
    // Return true to indicate success
    return true;
  } catch (error) {
    console.error('Error sending SMS verification code:', error);
    throw error;
  }
}

/**
 * Generate a random verification code
 * @param {number} length - Length of the code
 * @returns {string} - Random verification code
 */
function generateVerificationCode(length = 6) {
  // Generate a random numeric code of specified length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Enable SMS-based 2FA for a user
 * @param {string} userId - User ID
 * @returns {Object} - Object containing the verification ID
 */
async function enableSMSTwoFactor(userId) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a verification code
    const verificationCode = generateVerificationCode(6);
    const verificationId = uuidv4();
    
    // Store the verification data temporarily
    // In a real implementation, this should be stored in Redis or another temp storage
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes expiry
    
    // Update user's twoFactorAuth setting with the pending verification
    user.twoFactorAuth = {
      ...user.twoFactorAuth,
      pendingVerification: {
        id: verificationId,
        code: verificationCode,
        expires: expiryTime,
        method: 'sms'
      }
    };
    
    await user.save();
    
    // Send the verification code via SMS
    await sendSMSVerificationCode(user.phoneNumber, verificationCode);
    
    return { verificationId };
  } catch (error) {
    console.error('Error enabling SMS 2FA:', error);
    throw error;
  }
}

/**
 * Verify SMS 2FA setup
 * @param {string} userId - User ID
 * @param {string} verificationId - Verification ID
 * @param {string} code - Verification code
 * @returns {boolean} - Whether the verification was successful
 */
async function verifySMSTwoFactorSetup(userId, verificationId, code) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if the user has a pending verification
    if (!user.twoFactorAuth.pendingVerification ||
        user.twoFactorAuth.pendingVerification.id !== verificationId) {
      throw new Error('Invalid verification ID');
    }
    
    // Check if the verification has expired
    const expiryTime = new Date(user.twoFactorAuth.pendingVerification.expires);
    if (expiryTime < new Date()) {
      throw new Error('Verification has expired');
    }
    
    // Check if the code matches
    if (user.twoFactorAuth.pendingVerification.code !== code) {
      throw new Error('Invalid verification code');
    }
    
    // Enable 2FA for the user
    user.twoFactorAuth = {
      enabled: true,
      method: 'sms',
      backupCodes: generateBackupCodes(),
      // Remove the pending verification
      pendingVerification: null
    };
    
    await user.save();
    return true;
  } catch (error) {
    console.error('Error verifying SMS 2FA setup:', error);
    throw error;
  }
}

/**
 * Verify a user during login with 2FA
 * @param {string} userId - User ID
 * @param {string} code - Verification code or TOTP token
 * @returns {boolean} - Whether the verification was successful
 */
async function verifyTwoFactorLogin(userId, code) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorAuth.enabled) {
      throw new Error('Two-factor authentication is not enabled for this user');
    }
    
    // Check the 2FA method
    if (user.twoFactorAuth.method === 'totp') {
      // Verify TOTP token
      return verifyTOTP(code, user.twoFactorAuth.secret);
    } else if (user.twoFactorAuth.method === 'sms') {
      // For SMS, we need to check against a temporary code sent during login
      if (!user.twoFactorAuth.pendingLogin ||
          user.twoFactorAuth.pendingLogin.code !== code) {
        return false;
      }
      
      // Check if the code has expired
      const expiryTime = new Date(user.twoFactorAuth.pendingLogin.expires);
      if (expiryTime < new Date()) {
        return false;
      }
      
      // Clear the pending login
      user.twoFactorAuth = {
        ...user.twoFactorAuth,
        pendingLogin: null
      };
      
      await user.save();
      return true;
    }
    
    // Also check backup codes
    if (user.twoFactorAuth.backupCodes && user.twoFactorAuth.backupCodes.includes(code)) {
      // Remove the used backup code
      user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(c => c !== code);
      await user.save();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying 2FA login:', error);
    return false;
  }
}

/**
 * Send a login verification code for SMS 2FA
 * @param {string} userId - User ID
 * @returns {Object} - Object containing the verification ID
 */
async function sendLoginVerificationCode(userId) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if 2FA is enabled and the method is SMS
    if (!user.twoFactorAuth.enabled || user.twoFactorAuth.method !== 'sms') {
      throw new Error('SMS two-factor authentication is not enabled for this user');
    }
    
    // Generate a verification code
    const verificationCode = generateVerificationCode(6);
    const verificationId = uuidv4();
    
    // Store the verification data temporarily
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes expiry
    
    // Update user's twoFactorAuth setting with the pending login
    user.twoFactorAuth = {
      ...user.twoFactorAuth,
      pendingLogin: {
        id: verificationId,
        code: verificationCode,
        expires: expiryTime
      }
    };
    
    await user.save();
    
    // Send the verification code via SMS
    await sendSMSVerificationCode(user.phoneNumber, verificationCode);
    
    return { verificationId };
  } catch (error) {
    console.error('Error sending login verification code:', error);
    throw error;
  }
}

/**
 * Disable two-factor authentication for a user
 * @param {string} userId - User ID
 * @param {string} password - User's password for verification
 * @returns {boolean} - Whether the operation was successful
 */
async function disableTwoFactor(userId, verificationCode) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorAuth.enabled) {
      return true; // Already disabled
    }
    
    // Verify the user's identity with 2FA
    const isVerified = await verifyTwoFactorLogin(userId, verificationCode);
    if (!isVerified) {
      throw new Error('Invalid verification code');
    }
    
    // Disable 2FA
    user.twoFactorAuth = {
      enabled: false,
      method: null,
      secret: null,
      backupCodes: null
    };
    
    await user.save();
    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error;
  }
}

/**
 * Get the user's backup codes
 * @param {string} userId - User ID
 * @returns {Array} - Array of backup codes
 */
async function getBackupCodes(userId) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorAuth.enabled) {
      throw new Error('Two-factor authentication is not enabled for this user');
    }
    
    return user.twoFactorAuth.backupCodes || [];
  } catch (error) {
    console.error('Error getting backup codes:', error);
    throw error;
  }
}

/**
 * Generate new backup codes for a user
 * @param {string} userId - User ID
 * @returns {Array} - Array of new backup codes
 */
async function regenerateBackupCodes(userId) {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorAuth.enabled) {
      throw new Error('Two-factor authentication is not enabled for this user');
    }
    
    // Generate new backup codes
    const newBackupCodes = generateBackupCodes();
    
    // Update user's backup codes
    user.twoFactorAuth = {
      ...user.twoFactorAuth,
      backupCodes: newBackupCodes
    };
    
    await user.save();
    return newBackupCodes;
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    throw error;
  }
}

module.exports = {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  enableTOTP,
  enableSMSTwoFactor,
  verifySMSTwoFactorSetup,
  verifyTwoFactorLogin,
  sendLoginVerificationCode,
  disableTwoFactor,
  getBackupCodes,
  regenerateBackupCodes
};