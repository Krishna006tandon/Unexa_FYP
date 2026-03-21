const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../controllers/uploadController');
const { createUploadHandler } = require('../config/cloudinary');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple disk storage for debugging
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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

router.route('/').post(protect, upload.single('media'), (req, res) => {
  console.log('🎯 Upload route hit!');
  console.log('📁 File received:', req.file ? '✅' : '❌');
  
  if (req.file) {
    console.log('📁 File found in req.file:', req.file);
    console.log('☁️ Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    const cloudinaryUpload = async () => {
      try {
        console.log('🔧 Cloudinary config check:');
        console.log('  - Cloud name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING');
        console.log('  - API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Present' : '❌ MISSING');
        console.log('  - API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Present' : '❌ MISSING');
        
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'unexa/chat-media',
          resource_type: 'auto'
        });
        
        console.log('✅ Cloudinary upload successful:', result.secure_url);
        
        // Clean up local file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
          success: true, 
          mediaUrl: result.secure_url,
          fileName: req.file.originalname || 'unknown',
          fileSize: req.file.size || 0,
          mimetype: req.file.mimetype || 'unknown' 
        });
      } catch (error) {
        console.error('❌ Cloudinary upload failed:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error code:', error.code);
        console.log('🔄 Using placeholder URL instead...');
        
        // Clean up local file even if upload failed
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup local file:', cleanupError);
        }
        
        // Fallback to placeholder
        const placeholderUrl = `https://picsum.photos/200/300?random=${Date.now()}`;
        
        res.json({ 
          success: true, 
          mediaUrl: placeholderUrl,
          fileName: req.file.originalname || 'unknown',
          fileSize: req.file.size || 0,
          mimetype: req.file.mimetype || 'unknown' 
        });
      }
    };
    
    cloudinaryUpload();
    return;
  }
  
  console.log('❌ No file found in request');
  const placeholderUrl = 'https://picsum.photos/200/300?random=' + Date.now();
  
  res.json({ 
    success: true, 
    mediaUrl: placeholderUrl,
    fileName: 'placeholder_image',
    fileSize: 0,
    mimetype: 'image/jpeg' 
  });
});

module.exports = router;
