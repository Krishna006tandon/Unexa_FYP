# Cloudinary Integration Setup

This document explains how Cloudinary has been integrated into the UNEXA backend for profile image uploads.

## What Was Fixed

The original issue was that **Cloudinary was not implemented at all**. The system was using local file storage with multer, which caused problems with:

1. **No Cloudinary dependency** - Cloudinary package was missing
2. **Local file storage** - Images were saved to `/uploads/profiles/` on the server
3. **No cloud configuration** - No Cloudinary API keys or setup
4. **Static file serving** - Images served locally instead of via CDN

## Changes Made

### 1. Package Installation
```bash
npm install cloudinary@^1.21.0 multer-storage-cloudinary
```

### 2. Cloudinary Configuration (`config/cloudinary.js`)
- Cloudinary API configuration using environment variables
- Multer storage integration for automatic uploads
- Helper functions for upload, delete, and URL optimization
- Error handling and validation

### 3. Profile Controller Updates (`controllers/profileController.js`)
- Replaced local multer storage with Cloudinary storage
- Added automatic deletion of old images when updating
- Enhanced error handling for Cloudinary operations
- Maintained same API endpoints for frontend compatibility

### 4. Environment Variables
Created `.env.example` with required Cloudinary variables:
```
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## How It Works Now

### Avatar Upload Flow:
1. Frontend sends image to `/api/profile/avatar`
2. Multer receives the file and uploads directly to Cloudinary
3. Cloudinary returns a secure URL
4. URL is saved to the user's profile in MongoDB
5. Old avatar (if any) is deleted from Cloudinary

### Cover Image Upload Flow:
1. Frontend sends image to `/api/profile/cover`
2. Same process as avatar upload
3. URL saved to `coverImage` field in profile

## Setup Instructions

### 1. Get Cloudinary Credentials
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → Settings → API Keys
3. Copy your Cloud name, API Key, and API Secret

### 2. Configure Environment Variables
Create `.env` file in backend root:
```bash
# Copy from .env.example and add your credentials
cp .env.example .env
```

Edit `.env` with your actual Cloudinary credentials:
```env
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

### 3. Test the Setup
Run the test script:
```bash
node test-cloudinary.js
```

### 4. Start the Server
```bash
npm run dev
```

## API Endpoints (Unchanged)

### Upload Avatar
- **POST** `/api/profile/avatar`
- **Body**: `multipart/form-data` with `avatar` field
- **Response**: Updated profile object with Cloudinary URL

### Upload Cover Image
- **POST** `/api/profile/cover`
- **Body**: `multipart/form-data` with `coverImage` field
- **Response**: Updated profile object with Cloudinary URL

## Frontend Integration

No changes needed in frontend code! The same API endpoints work:

```javascript
// Example from profileService.js
const formData = new FormData();
formData.append('avatar', {
  uri: imageUri,
  type: 'image/jpeg',
  name: `avatar_${Date.now()}.jpg`,
});

const response = await axios.post(`${API_URL}/api/profile/avatar`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    Authorization: `Bearer ${token}`,
  },
});
```

## Benefits of Cloudinary Integration

1. **CDN Delivery** - Images served from Cloudinary's global CDN
2. **Automatic Optimization** - Images optimized for web/mobile
3. **Storage Management** - No local storage issues
4. **Scalability** - Handles unlimited uploads
5. **Security** - Secure URLs and access control
6. **Transformations** - On-the-fly image resizing and effects

## Troubleshooting

### Common Issues:

1. **"Cloudinary credentials not set"**
   - Check `.env` file exists and has correct values
   - Ensure environment variables are loaded

2. **"Upload failed" errors**
   - Verify Cloudinary API keys are correct
   - Check internet connection
   - Ensure Cloudinary account is active

3. **"File too large" errors**
   - Current limit is 5MB per file
   - Can be adjusted in `config/cloudinary.js`

4. **"Invalid file type" errors**
   - Allowed types: jpeg, jpg, png, gif, webp
   - Can be adjusted in `config/cloudinary.js`

### Debug Commands:

```bash
# Test Cloudinary connection
node test-cloudinary.js

# Check environment variables
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# Start with debug logging
DEBUG=cloudinary:* npm run dev
```

## Security Notes

- Never commit `.env` file to version control
- Cloudinary API secret should be kept secure
- Consider using signed URLs for production
- Implement rate limiting for upload endpoints

## Future Enhancements

1. **Image Transformations** - Add endpoints for dynamic resizing
2. **Video Upload** - Extend to support video files
3. **Bulk Operations** - Add batch upload/delete capabilities
4. **Analytics** - Track image usage and performance
5. **Backup** - Implement backup strategies for important images
