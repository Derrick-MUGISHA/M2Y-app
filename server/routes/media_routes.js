const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media_controller');
const { authenticate } = require('../middleware/auth_middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Upload media file
router.post('/upload', mediaController.uploadMedia);

// Delete media file
router.delete('/:filename', mediaController.deleteMedia);

module.exports = router;
