const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../controllers/uploadController');

const router = express.Router();

// Ensure uploads dir exists for local media storage
const dir = './uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Map multer to disk storage so the frontend can retrieve the images natively
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'unexa_' + Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

router.route('/').post(protect, upload.single('media'), uploadMedia);

module.exports = router;
