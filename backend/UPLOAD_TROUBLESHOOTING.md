# Upload Endpoint Troubleshooting

## 🚨 **Problem: Files Upload Not Working**

Backend mein Cloudinary configure hai but file upload nahi ho raha.

## 🔍 **Root Cause Analysis**

### **Current Status:**
- ✅ Cloudinary credentials: Set and working
- ✅ Environment variables: Loading correctly
- ✅ Cloudinary config: Loading successfully
- ✅ Multer storage: Configured properly
- ❌ File upload: Not working

### **Possible Issues:**

#### **1. Multer Configuration Issue**
**Problem**: `upload.storage` might not be properly configured
**Check**: CloudinaryStorage instance working correctly

#### **2. File Size Limit Issue**
**Problem**: File size too large for upload
**Current Limits**:
- Chat upload: 50MB
- Profile upload: 5MB
- Media share: 100MB

#### **3. File Type Issue**
**Problem**: File type not allowed
**Allowed Types**:
- Chat: images, videos, audio
- Profile: images only
- Media share: images, videos

#### **4. Route Configuration Issue**
**Problem**: Route not properly mounted
**Check**: Express app mounting

## 🔧 **Debugging Steps**

### **Step 1: Test Upload Route Directly**
```bash
# Start server
npm start

# Test endpoint
curl -X POST http://localhost:5000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@test.txt"
```

### **Step 2: Check Server Logs**
```bash
# Look for these log messages:
- "Upload error:"
- "Cloudinary error:"
- "Multer error:"
- "File received:"
```

### **Step 3: Check Cloudinary Upload**
```javascript
// Test direct Cloudinary upload
const { uploadToCloudinary } = require('./config/cloudinary');

uploadToCloudinary('./test.jpg', 'unexa/test')
  .then(result => console.log('✅ Direct upload works:', result))
  .catch(error => console.error('❌ Direct upload failed:', error));
```

## 🛠️ **Potential Fixes**

### **Fix 1: Update Multer Configuration**
```javascript
// In config/cloudinary.js
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'unexa/chat-media',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav'],
    resource_type: 'auto', // Add this
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      return `media_${timestamp}_${random}`;
    }
  }
});
```

### **Fix 2: Update Upload Controller**
```javascript
// In controllers/uploadController.js
exports.uploadMedia = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // Log file details
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    // The file is already uploaded to Cloudinary via multer-storage-cloudinary
    const mediaUrl = req.file.path;

    console.log('✅ Cloudinary URL:', mediaUrl);

    res.status(200).json({ 
      success: true, 
      mediaUrl: mediaUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype 
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### **Fix 3: Update Upload Routes**
```javascript
// In routes/uploadRoutes.js
const chatUpload = multer({
  storage: upload.storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('🔍 File filter check:', file.mimetype);
    
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error('Only images, videos, and audio files are allowed'), false);
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
```

## 🧪 **Test Script**

Create a test file to debug the upload:

```javascript
// debug-upload.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Test configuration
console.log('🔧 Configuration Test:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅' : '❌');

// Test modules
try {
  const { upload } = require('./config/cloudinary');
  console.log('✅ Cloudinary config loaded');
  
  const { uploadMedia } = require('./controllers/uploadController');
  console.log('✅ Upload controller loaded');
  
  const uploadRoutes = require('./routes/uploadRoutes');
  console.log('✅ Upload routes loaded');
  
} catch (error) {
  console.error('❌ Module loading error:', error.message);
}
```

## 📋 **What to Check**

### **Server Logs:**
- Look for "Upload request received"
- Check for "File details:" logs
- Look for Cloudinary URL logs
- Check for any error messages

### **Frontend Console:**
- Check network requests
- Look for upload errors
- Verify API responses
- Check file selection

### **Cloudinary Dashboard:**
- Check if files are being uploaded
- Look at upload logs
- Verify folder structure
- Check API usage

## 🚀 **Quick Fix**

If you need to get this working immediately:

1. **Add debug logs** to upload controller
2. **Test with small files** (under 1MB)
3. **Check file types** (try with .jpg only)
4. **Verify authentication** (check JWT token)
5. **Test API endpoints** directly with curl

---

**Next**: Add debug logging and test with small files
