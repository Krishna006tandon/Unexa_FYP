const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/authMiddleware');
const videoController = require('../controllers/videoController');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many uploads, please try again later',
});

router.post('/upload', protect, uploadLimiter, videoController.videoUploadMiddleware, videoController.uploadVideo);
router.get('/feed', videoController.getFeed);
router.get('/reels', (req, res, next) => {
  req.query.kind = 'reel';
  next();
}, videoController.getFeed);
router.get('/long', (req, res, next) => {
  req.query.kind = 'long';
  next();
}, videoController.getFeed);
router.get('/search', videoController.searchVideos);
router.get('/related/:id', videoController.getRelated);
router.get('/:id', videoController.getVideoById);
router.post('/like', protect, videoController.likeVideo);
router.post('/comment', protect, videoController.commentVideo);

module.exports = router;
