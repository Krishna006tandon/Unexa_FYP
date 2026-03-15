const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for memory storage (buffer will be uploaded directly to S3)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Single route for unified multipart uploads
router.route('/').post(protect, upload.single('media'), uploadMedia);

module.exports = router;
