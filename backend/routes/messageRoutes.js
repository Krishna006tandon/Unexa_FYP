const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { sendMessage, allMessages, deleteMessage, editMessage, toggleReaction, toggleStar, forwardMessages, getStarredMessages } = require('../controllers/messageController');

const router = express.Router();

router.route('/starred').get(protect, getStarredMessages);
router.route('/:chatId').get(protect, allMessages);
router.route('/').post(protect, sendMessage);
router.route('/react').post(protect, toggleReaction);
router.route('/star').post(protect, toggleStar);
router.route('/forward').post(protect, forwardMessages);
router.route('/:id').delete(protect, deleteMessage);
router.route('/:id').put(protect, editMessage);

module.exports = router;
