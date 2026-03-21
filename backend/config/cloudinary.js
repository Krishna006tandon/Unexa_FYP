const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'unexa/chat-media', // Default folder for chat media
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav'],
    resource_type: 'auto', // Add this line
    public_id: (req, file) => {
      // Generate unique filename based on route
      const route = req.route.path;
      let prefix = 'media';
      
      if (route.includes('profile')) {
        prefix = 'profile';
      } else if (route.includes('media')) {
        prefix = 'chat-media';
      }
      
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      return `${prefix}_${timestamp}_${random}`;
    }
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Create specialized upload handlers for different use cases
const createUploadHandler = (options = {}) => {
  const {
    folder = 'unexa/general',
    fileSizeLimit = 5 * 1024 * 1024,
    allowedTypes = ['image'],
    fileFilter = null
  } = options;

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: allowedTypes.includes('video') 
        ? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm']
        : allowedTypes.includes('audio')
        ? ['mp3', 'wav', 'ogg', 'm4a']
        : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const fileExt = file.originalname.split('.').pop();
        return `file_${timestamp}_${random}`;
      }
    }
  });

  const defaultFileFilter = (req, file, cb) => {
    if (allowedTypes.includes('image') && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else if (allowedTypes.includes('video') && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (allowedTypes.includes('audio') && file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedTypes.join(', ')} files are allowed`), false);
    }
  };

  return multer({
    storage: storage,
    limits: {
      fileSize: fileSizeLimit
    },
    fileFilter: fileFilter || defaultFileFilter
  });
};

// Helper function to upload to Cloudinary directly
const uploadToCloudinary = async (filePath, folder = 'unexa/profiles', publicId = null) => {
  try {
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    return result;
  } catch (error) {
    throw error;
  }
};

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

// Helper function to get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    fetch_format: 'auto',
    quality: 'auto',
    crop: 'fill',
    gravity: 'face'
  };

  const finalOptions = { ...defaultOptions, ...options };
  return cloudinary.url(publicId, finalOptions);
};

module.exports = {
  cloudinary,
  upload,
  createUploadHandler,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl
};
