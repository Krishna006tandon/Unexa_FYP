const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  uploadStory,
  getStories,
  viewStory,
  deleteStory,
  getMyStories,
  getArchivedStories,
  reactToStory,
  replyToStory,
  getStoryInteractions
} = require('../controllers/storyController');

const router = express.Router();

// Upload a new story
router.route('/upload').post(protect, uploadStory);

// Get all stories from followed users
router.route('/').get(protect, getStories);

// Get user's own stories
router.route('/my').get(protect, getMyStories);

// Get user's archived stories
router.route('/archived').get(protect, getArchivedStories);

// View a specific story
router.route('/:storyId/view').post(protect, viewStory);

// Delete a story
router.route('/:storyId').delete(protect, deleteStory);

// React to a story
router.route('/:storyId/react').post(protect, reactToStory);

// Reply to a story
router.route('/:storyId/reply').post(protect, replyToStory);

// Get story interactions (reactions and replies)
router.route('/:storyId/interactions').get(protect, getStoryInteractions);

module.exports = router;
