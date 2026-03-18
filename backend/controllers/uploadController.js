const { uploadToS3 } = require('../services/mediaService');

exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // Call service to get final URL
    const mediaUrl = await uploadToS3(file, req);

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
