const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { sendMessage, allMessages, deleteMessage, editMessage, toggleReaction } = require('../controllers/messageController');

const router = express.Router();

router.route('/:chatId').get(protect, allMessages);
router.route('/').post(protect, sendMessage);
router.route('/react').post(protect, toggleReaction);
router.route('/:id').delete(protect, deleteMessage);
router.route('/:id').put(protect, editMessage);

module.exports = router;
