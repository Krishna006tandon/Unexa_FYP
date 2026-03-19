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
    // Accept images and videos for chat
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images, videos, and audio files are allowed'), false);
    }
  }
});

router.route('/').post(protect, chatUpload.single('media'), uploadMedia);

module.exports = router;
