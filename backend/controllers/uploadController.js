const { uploadToCloudinary } = require('../config/cloudinary');

exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // The file is already uploaded to Cloudinary via multer-storage-cloudinary
    // The Cloudinary URL is available in req.file.path
    const mediaUrl = req.file.path;

    res.status(200).json({ 
      success: true, 
      mediaUrl: mediaUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};
