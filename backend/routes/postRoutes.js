const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');
const { createUploadHandler } = require('../config/cloudinary');

const router = express.Router();

const postImageUpload = createUploadHandler({
  folder: 'unexa/posts',
  fileSizeLimit: 8 * 1024 * 1024,
  allowedTypes: ['image'],
});

const postWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many post requests, please try again later',
  validate: { trustProxy: false },
});

router.post('/create', protect, postWriteLimiter, postImageUpload.single('image'), postController.createPost);
router.get('/feed', postController.getFeed);
router.post('/like', protect, postController.likePost);
router.get('/:id', postController.getById);
router.post('/comment', protect, postWriteLimiter, postController.commentPost);
router.put('/:id', protect, postWriteLimiter, postImageUpload.single('image'), postController.updatePost);
router.delete('/:id', protect, postWriteLimiter, postController.deletePost);

module.exports = router;
