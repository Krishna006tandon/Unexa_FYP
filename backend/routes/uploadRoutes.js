const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../controllers/uploadController');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Configure Cloudinary storage for chat media
const chatUpload = multer({
  storage: upload.storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    console.log('🔍 File filter check:', file.mimetype);
    
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error('Only images, videos, audio, and PDF files are allowed'), false);
    }
  }
});

// Add error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error.message);
    return res.status(400).json({ error: error.message });
  }
  next();
});

router.route('/').post(protect, chatUpload.single('media'), uploadMedia);

module.exports = router;
