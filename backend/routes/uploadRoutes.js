const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../controllers/uploadController');
const { createUploadHandler } = require('../config/cloudinary');

const router = express.Router();

// Configure Cloudinary storage for chat media
const chatUpload = createUploadHandler({
  folder: 'unexa/chat-media',
  fileSizeLimit: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['image', 'video', 'audio', 'file'],
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

// Test route for debugging
router.get('/test', (req, res) => {
  console.log('🧪 Upload test route hit!');
  res.json({ message: 'Upload routes working!' });
});

// Simple POST test
router.post('/test', (req, res) => {
  console.log('🧪 Upload POST test route hit!');
  console.log('📄 Headers:', req.headers);
  console.log('📄 Body:', req.body);
  res.json({ message: 'Upload POST route working!' });
});

// Bypass upload route for testing
router.post('/bypass', protect, (req, res) => {
  console.log('🚀 Bypass upload route hit!');
  console.log('📄 Headers:', req.headers);
  console.log('📄 Body:', req.body);
  
  // Return a mock Cloudinary URL for testing
  const mockUrl = 'https://res.cloudinary.com/ddw7kbm3k/image/upload/test.jpg';
  
  res.json({ 
    success: true, 
    mediaUrl: mockUrl,
    fileName: 'test.jpg',
    fileSize: 12345,
    mimetype: 'image/jpeg' 
  });
});

// Add error handling middleware
router.use((error, req, res, next) => {
  console.log('🔍 Upload route error handler:', error);
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error.message);
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    console.error('❌ General upload error:', error.message);
    return res.status(400).json({ error: error.message });
  }
  next();
});

router.route('/').post(protect, chatUpload.single('media'), (req, res, next) => {
  console.log('🎯 Upload route hit!');
  console.log('📁 File received:', req.file ? '✅' : '❌');
  if (req.file) {
    console.log('📋 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
  }
  next();
}, uploadMedia);

module.exports = router;
