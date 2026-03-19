const { cloudinary } = require('../config/cloudinary');

// This service now handles Cloudinary URL generation and media management
exports.uploadToCloudinary = async (file, req) => {
  try {
    // For direct Cloudinary uploads (not through multer-storage-cloudinary)
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'unexa/chat-media',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav']
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Generate proper media URL for frontend
exports.getMediaUrl = (mediaUrl, req = null) => {
  // If it's already a full URL (Cloudinary), return as is
  if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
    return mediaUrl;
  }
  
  // For backward compatibility with any local files
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.HOST || (req && req.get('host')) || 'localhost:5000';
  
  return `${protocol}://${host}/uploads/${mediaUrl}`;
};

// Delete media from Cloudinary
exports.deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
exports.getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  try {
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const publicId = fileName.split('.')[0];
    const folderIndex = urlParts.findIndex(part => part === 'unexa');
    
    if (folderIndex !== -1) {
      const folder = urlParts.slice(folderIndex, -1).join('/');
      return `${folder}/${publicId}`;
    }
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Legacy function for backward compatibility
exports.uploadToS3 = async (file, req) => {
  // This function is now deprecated but kept for backward compatibility
  // It now returns a Cloudinary URL instead of local storage URL
  console.warn('uploadToS3 is deprecated, use Cloudinary directly');
  
  // If file is already uploaded to Cloudinary (via multer-storage-cloudinary)
  if (file.path && file.path.includes('cloudinary.com')) {
    return file.path;
  }
  
  // Otherwise, upload it directly
  return exports.uploadToCloudinary(file, req);
};
