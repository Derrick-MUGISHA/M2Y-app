const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Set file size limits and filters
const fileFilter = (req, file, cb) => {
  // Accept images, documents, audio, and video
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Video
    'video/mp4', 'video/mpeg', 'video/quicktime'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: fileFilter
});

/**
 * Upload media file
 */
exports.uploadMedia = (req, res, next) => {
  // Use multer upload middleware
  upload.single('file')(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // Multer error (e.g., file too large)
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // Other error
      return res.status(400).json({ message: err.message });
    }
    
    // File uploaded successfully
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Generate and return the file URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const fileUrl = baseUrl + '/uploads/' + req.file.filename;
    
    res.status(201).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    });
  });
};

/**
 * Delete media file
 */
exports.deleteMedia = (req, res, next) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }
    
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
};