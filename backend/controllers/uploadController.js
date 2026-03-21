const { uploadToCloudinary } = require('../config/cloudinary');

exports.uploadMedia = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('📁 File:', req.file);
    console.log('📄 Body:', req.body);
    
    // Check Cloudinary configuration
    console.log('☁️ Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
      api_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'
    });
    
    const file = req.file;

    if (!file) {
      console.log('❌ No file provided');
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // Log file details
    console.log('📁 File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    // The file is already uploaded to Cloudinary via multer-storage-cloudinary
    // The Cloudinary URL is available in req.file.path
    const mediaUrl = req.file.path;

    if (!mediaUrl) {
      console.log('❌ No Cloudinary URL received');
      return res.status(500).json({ error: 'Failed to upload to Cloudinary' });
    }

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
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};
