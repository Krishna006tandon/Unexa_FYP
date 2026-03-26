const express = require('express');
const { registerUser, authUser, allUsers, resetPassword, verifyOTP, updatePushToken } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').post(registerUser).get(protect, allUsers);
router.route('/login').post(authUser);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/push-token', protect, updatePushToken);

module.exports = router;
