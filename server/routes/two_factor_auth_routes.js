const express = require('express');
const twoFactorAuthController = require('../controllers/two_factor_auth_controller');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// Routes that require authentication
router.use('/user', authMiddleware.authenticate);
router.get('/user/status', twoFactorAuthController.getStatus);
router.post('/user/totp/setup', twoFactorAuthController.setupTOTP);
router.post('/user/totp/verify', twoFactorAuthController.verifyAndEnableTOTP);
router.post('/user/sms/setup', twoFactorAuthController.setupSMS);
router.post('/user/sms/verify', twoFactorAuthController.verifyAndEnableSMS);
router.post('/user/disable', twoFactorAuthController.disable);
router.get('/user/backup-codes', twoFactorAuthController.getBackupCodes);
router.post('/user/backup-codes/regenerate', twoFactorAuthController.regenerateBackupCodes);

// Public routes for login
router.post('/login/send-code', twoFactorAuthController.sendLoginVerificationCode);
router.post('/login/verify', twoFactorAuthController.verifyLogin);

module.exports = router;