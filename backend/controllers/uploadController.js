const { uploadToS3 } = require('../services/mediaService');

exports.uploadMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload a file' });
    }

    // You can add validation logic based on the `mimetype`
    // image/jpeg, video/mp4, audio/mpeg, etc.
    
    // Upload to our Cloud Storage abstraction
    const mediaUrl = await uploadToS3(file);

    res.status(200).json({ 
      success: true, 
      mediaUrl: mediaUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
