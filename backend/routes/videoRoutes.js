const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const videoController = require('../controllers/videoController');

const router = express.Router();

router.post('/upload', protect, videoController.videoUploadMiddleware, videoController.uploadVideo);
router.get('/feed', videoController.getFeed);
router.get('/search', videoController.searchVideos);
router.get('/:id', videoController.getVideoById);
router.post('/like', protect, videoController.likeVideo);
router.post('/comment', protect, videoController.commentVideo);

module.exports = router;

