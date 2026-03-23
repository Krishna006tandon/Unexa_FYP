const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { 
  forwardMessage, 
  toggleStarMessage, 
  setVanishMessage 
} = require('../controllers/advancedChatController');
const { 
  recordProfileView, 
  getProfileInsights, 
  createHighlight, 
  getUserHighlights, 
  getMutualFriends,
  toggleCloseFriend
} = require('../controllers/advancedProfileController');

const router = express.Router();

// Chat related
router.post('/chat/forward', protect, forwardMessage);
router.post('/chat/:messageId/star', protect, toggleStarMessage);
router.post('/chat/vanish', protect, setVanishMessage);

// Profile related
router.post('/profile/:userId/view', protect, recordProfileView);
router.get('/profile/insights', protect, getProfileInsights);
router.post('/profile/highlights', protect, createHighlight);
router.get('/profile/:userId/highlights', protect, getUserHighlights);
router.get('/profile/:userId/mutuals', protect, getMutualFriends);
router.post('/profile/close-friends/toggle', protect, toggleCloseFriend);

module.exports = router;
