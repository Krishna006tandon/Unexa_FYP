const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MediaShare = require('../models/MediaShare');
const Streak = require('../models/Streak');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const { upload, deleteFromCloudinary } = require('../config/cloudinary');

// Configure local storage for media share (not Cloudinary storage)
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'media-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// POST /api/media/share - Share media with friends
router.post('/share', protect, mediaUpload.single('media'), async (req, res) => {
  try {
    console.log('🎯 Media share route hit!');
    console.log('📁 File received:', req.file ? '✅' : '❌');
    console.log('👤 User authenticated:', req.user ? '✅' : '❌');
    console.log('📝 Request body:', req.body);
    console.log('📝 Recipients:', req.body.recipients);
    console.log('📝 Caption:', req.body.caption);
    
    const { recipients, caption } = req.body;
    
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ error: 'Media file is required' });
    }
    
    if (!recipients || recipients.length === 0) {
      console.log('❌ No recipients provided');
      return res.status(400).json({ error: 'At least one recipient is required' });
    }
    
    // Parse recipients from string to array
    const recipientIds = Array.isArray(recipients) ? recipients : JSON.parse(recipients);
    console.log('🔢 Parsed recipient IDs:', recipientIds);
    
    // Validate recipients
    const validRecipients = await User.find({ _id: { $in: recipientIds } });
    if (validRecipients.length !== recipientIds.length) {
      return res.status(400).json({ error: 'Invalid recipients' });
    }
    
    // The file is saved locally, now upload to Cloudinary directly
    console.log('🔄 Uploading to Cloudinary...');
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'unexa/media-share',
      resource_type: 'auto'
    });
    
    const mediaUrl = result.secure_url;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    console.log('☁️ Cloudinary upload successful!');
    console.log('🔗 Cloudinary URL:', mediaUrl);
    console.log('📁 File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Clean up local file
    fs.unlinkSync(req.file.path);
    console.log('🗑️ Local file cleaned up');
    
    // Create media share
    const mediaShare = new MediaShare({
      sender: req.user._id,
      recipients: recipientIds,
      mediaUrl,
      mediaType,
      caption: caption || '',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      duration: mediaType === 'video' ? 0 : undefined // You might want to extract video duration
    });
    
    await mediaShare.save();
    console.log('✅ Media share saved to database');
    
    // Update or create streaks for each recipient
    let streaksUpdated = 0;
    for (const recipientId of recipientIds) {
      const users = [req.user._id, recipientId].sort();
      
      let streak = await Streak.findOne({ 
        users: { $all: users, $size: 2 }
      });
      
      if (streak) {
        // Use the model method for consistent logic (day diff, history, milestones)
        const updated = streak.updateStreak(req.user._id, mediaShare._id);
        if (updated) {
          await streak.save();
          streaksUpdated++;
        }
      } else {
        // Create new streak
        const newStreak = new Streak({
          users: users,
          currentStreak: 1,
          lastSharedDate: new Date(),
          streakHistory: [{
            date: new Date(),
            sharedBy: req.user._id,
            mediaShare: mediaShare._id
          }]
        });
        await newStreak.save();
        streaksUpdated++;
      }
    }
    
    console.log(`✅ Streaks updated: ${streaksUpdated}`);

    const io = req.app.get('io');
    if (io) {
      for (const recipientId of recipientIds) {
        io.to(`profile_${recipientId}`).emit('media-received', {
          senderId: req.user._id,
          senderName: req.user.username || 'Someone',
          mediaType: mediaType,
          mediaId: mediaShare._id
        });
      }
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Media shared successfully',
      mediaShare: {
        id: mediaShare._id,
        mediaUrl,
        mediaType,
        caption: caption || '',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        createdAt: mediaShare.createdAt
      },
      streaksUpdated
    });
    
  } catch (error) {
    console.error('❌ Media share error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate media share' });
    }
    
    // Generic error
    res.status(500).json({ 
      error: 'Internal server error during media sharing',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/media/shared-with-me - Get media shared with current user
router.get('/shared-with-me', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const mediaShares = await MediaShare.find({ 
      recipients: req.user._id,
      isDeleted: false 
    })
    .populate('sender', 'username profilePhoto')
    .populate('recipients', 'username profilePhoto')
    .populate('views.user', 'username profilePhoto')
    .populate('reactions.user', 'username')
    .populate('comments.user', 'username profilePhoto')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const total = await MediaShare.countDocuments({ 
      recipients: req.user._id,
      isDeleted: false 
    });
    
    res.json({
      mediaShares,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
    
  } catch (error) {
    console.error('Error fetching shared media:', error);
    res.status(500).json({ error: 'Failed to fetch shared media' });
  }
});

// GET /api/media/my-shares - Get media shared by current user
router.get('/my-shares', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const mediaShares = await MediaShare.find({ 
      sender: req.user._id,
      isDeleted: false 
    })
    .populate('recipients', 'username profilePhoto')
    .populate('views.user', 'username profilePhoto')
    .populate('reactions.user', 'username')
    .populate('comments.user', 'username profilePhoto')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const total = await MediaShare.countDocuments({ 
      sender: req.user._id,
      isDeleted: false 
    });
    
    res.json({
      mediaShares,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
    
  } catch (error) {
    console.error('Error fetching my shares:', error);
    res.status(500).json({ error: 'Failed to fetch your shares' });
  }
});

// POST /api/media/:id/view - Mark media as viewed
router.post('/:id/view', protect, async (req, res) => {
  try {
    const mediaShare = await MediaShare.findOne({
      _id: req.params.id,
      recipients: req.user._id,
      isDeleted: false
    });
    
    if (!mediaShare) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Check if already viewed
    const alreadyViewed = mediaShare.views.some(
      view => view.user.toString() === req.user._id.toString()
    );
    
    if (!alreadyViewed) {
      mediaShare.views.push({ user: req.user._id });
      await mediaShare.save();
    }
    
    res.json({ message: 'Media marked as viewed' });
    
  } catch (error) {
    console.error('Error marking media as viewed:', error);
    res.status(500).json({ error: 'Failed to mark media as viewed' });
  }
});

// POST /api/media/:id/react - Add reaction to media
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    const mediaShare = await MediaShare.findOne({
      _id: req.params.id,
      recipients: req.user._id,
      isDeleted: false
    });
    
    if (!mediaShare) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Remove existing reaction by this user
    mediaShare.reactions = mediaShare.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );
    
    // Add new reaction
    mediaShare.reactions.push({ user: req.user._id, emoji });
    await mediaShare.save();
    
    res.json({ message: 'Reaction added successfully' });
    
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// POST /api/media/:id/comment - Add comment to media
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    if (content.length > 300) {
      return res.status(400).json({ error: 'Comment too long (max 300 characters)' });
    }
    
    const mediaShare = await MediaShare.findOne({
      _id: req.params.id,
      recipients: req.user._id,
      isDeleted: false
    });
    
    if (!mediaShare) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    mediaShare.comments.push({ 
      user: req.user._id, 
      content: content.trim() 
    });
    await mediaShare.save();
    
    // Populate the new comment
    await mediaShare.populate('comments.user', 'username profilePhoto');
    
    const newComment = mediaShare.comments[mediaShare.comments.length - 1];
    
    res.json({ 
      message: 'Comment added successfully', 
      comment: newComment 
    });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
