const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  accessChat,
  fetchChats,
  fetchFriends,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  updateGroupPhoto,
  toggleAdmin,
} = require('../controllers/chatController');

const router = express.Router();

router.route('/').post(protect, accessChat);
router.route('/').get(protect, fetchChats);
router.route('/friends').get(protect, fetchFriends);
router.route('/group').post(protect, createGroupChat);
router.route('/rename').put(protect, renameGroup);
router.route('/remove').put(protect, removeFromGroup);
router.route('/add').put(protect, addToGroup);
router.route('/update-photo').put(protect, updateGroupPhoto);
router.route('/toggle-admin').put(protect, toggleAdmin);
router.route('/:chatId').get(protect, accessChat);

module.exports = router;
