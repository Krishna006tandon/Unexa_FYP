const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getMyProfile,
  getProfileByIdentifier,
  uploadAvatar,
  uploadCoverImage,
  searchProfiles,
  deleteProfile,
  toggleVisibility,
  followUser,
  unfollowUser,
  toggleCloseFriend
} = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes except public ones
router.use(protect);

// @route   POST /api/profile
// @desc    Create or update profile
// @access  Private
router.route('/')
  .post(createOrUpdateProfile)
  .delete(deleteProfile);

// @route   GET /api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', getMyProfile);

// @route   POST /api/profile/avatar
// @desc    Upload avatar
// @access  Private
router.post('/avatar', uploadAvatar);

// @route   POST /api/profile/cover
// @desc    Upload cover image
// @access  Private
router.post('/cover', uploadCoverImage);

// @route   GET /api/profile/search
// @desc    Search profiles
// @access  Public (but requires auth middleware for consistency)
router.get('/search', searchProfiles);

// @route   PATCH /api/profile/visibility
// @desc    Toggle profile visibility
// @access  Private
router.patch('/visibility', toggleVisibility);

// @route   GET /api/profile/:identifier
// @desc    Get profile by username or ID
// @access  Public (but requires auth middleware for consistency)
router.get('/:identifier', getProfileByIdentifier);

// Follow/Unfollow
router.post('/:id/follow', followUser);
router.post('/:id/unfollow', unfollowUser);

// Close Friend
router.post('/:id/close-friend', toggleCloseFriend);

module.exports = router;
