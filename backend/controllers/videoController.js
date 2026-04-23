const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { createVideoFromUpload, safeUnlink } = require('../services/videoService');

const uploadTempDir = path.join(__dirname, '..', 'uploads', 'tmp');
if (!fs.existsSync(uploadTempDir)) fs.mkdirSync(uploadTempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadTempDir);
  },
  filename: function (req, file, cb) {
    const safeName = (file.originalname || 'video').replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (file?.mimetype && file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed'));
  },
  limits: { fileSize: 1024 * 1024 * 300 }, // 300MB
});

// Accept `video` (preferred) and `media` (legacy) field names from clients.
exports.videoUploadMiddleware = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 1 },
]);

exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, kind } = req.body || {};
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });
    const uploadedFile = (req.files?.video && req.files.video[0]) || (req.files?.media && req.files.media[0]) || null;
    if (!uploadedFile) return res.status(400).json({ success: false, error: 'video file is required' });

    const video = await createVideoFromUpload({
      req,
      userId: req.user._id,
      title,
      description,
      uploadedFile,
      kind,
    });

    res.json({ success: true, data: video });
  } catch (error) {
    // best-effort cleanup of the temp upload
    const uploadedFile = (req.files?.video && req.files.video[0]) || (req.files?.media && req.files.media[0]) || null;
    safeUnlink(uploadedFile?.path);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const inc = (req.query.incrementView || '').toString().toLowerCase() === 'true';
    const video = await Video.findById(req.params.id).populate('userId', 'username profilePhoto');
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });

    if (inc) {
      video.views += 1;
      await video.save();
    }

    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRelated = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });

    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const kind = (req.query.kind || '').toString().trim().toLowerCase();
    const kindFilter = kind === 'reel' ? { kind: 'reel' } : kind === 'long' ? { kind: 'long' } : {};

    const items = await Video.find({
      _id: { $ne: video._id },
      userId: video.userId,
      ...kindFilter,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username profilePhoto');

    res.json({ success: true, data: { items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;
    const kind = (req.query.kind || '').toString().trim().toLowerCase();
    const filter = kind === 'reel' ? { kind: 'reel' } : kind === 'long' ? { kind: 'long' } : {};

    const [items, total] = await Promise.all([
      Video.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username profilePhoto'),
      Video.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { items, page, limit, total, hasMore: skip + items.length < total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.searchVideos = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const kind = (req.query.kind || '').toString().trim().toLowerCase();
    const kindFilter = kind === 'reel' ? { kind: 'reel' } : kind === 'long' ? { kind: 'long' } : {};
    if (!q) return res.json({ success: true, data: { items: [] } });

    const items = await Video.find({ ...kindFilter, $text: { $search: q } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(30)
      .populate('userId', 'username profilePhoto');

    res.json({ success: true, data: { items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.likeVideo = async (req, res) => {
  try {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ success: false, error: 'videoId is required' });

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });

    const userId = req.user._id.toString();
    const hasLiked = (video.likedBy || []).some((id) => id.toString() === userId);

    if (hasLiked) {
      video.likedBy = video.likedBy.filter((id) => id.toString() !== userId);
      video.likes = Math.max(0, (video.likes || 0) - 1);
    } else {
      video.likedBy.push(req.user._id);
      video.likes = (video.likes || 0) + 1;
    }

    await video.save();
    res.json({ success: true, data: { videoId: video._id, likes: video.likes, liked: !hasLiked } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.commentVideo = async (req, res) => {
  try {
    const { videoId, content } = req.body || {};
    if (!videoId) return res.status(400).json({ success: false, error: 'videoId is required' });
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });

    video.comments.push({ userId: req.user._id, content: content.toString() });
    await video.save();

    res.json({ success: true, data: { videoId: video._id, comments: video.comments.slice(-20) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
