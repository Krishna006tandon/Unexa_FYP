const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MediaShare = require('../models/MediaShare');
const Streak = require('../models/Streak');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// POST /api/media/share - Share media with friends
router.post('/share', protect, upload.single('media'), async (req, res) => {
  try {
    const { recipients, caption } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Media file is required' });
    }
    
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }
    
    // Parse recipients from string to array
    const recipientIds = Array.isArray(recipients) ? recipients : JSON.parse(recipients);
    
    // Validate recipients
    const validRecipients = await User.find({ _id: { $in: recipientIds } });
    if (validRecipients.length !== recipientIds.length) {
      return res.status(400).json({ error: 'Invalid recipients' });
    }
    
    const mediaUrl = `/uploads/media/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
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
    
    // Update or create streaks for each recipient
    for (const recipientId of recipientIds) {
      const users = [req.user._id, recipientId].sort();
      
      let streak = await Streak.findOne({ 
        users: { $all: users, $size: 2 },
        isActive: true 
      });
      
      if (!streak) {
        streak = new Streak({ users });
      }
      
      const streakUpdated = streak.updateStreak(req.user._id, mediaShare._id);
      if (streakUpdated) {
        await streak.save();
      }
    }
    
    // Populate sender and recipients info
    await mediaShare.populate('sender', 'username profilePhoto');
    await mediaShare.populate('recipients', 'username profilePhoto');
    
    res.status(201).json({ 
      message: 'Media shared successfully', 
      mediaShare,
      streaksUpdated: recipientIds.length 
    });
    
  } catch (error) {
    console.error('Error sharing media:', error);
    res.status(500).json({ error: 'Failed to share media' });
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
