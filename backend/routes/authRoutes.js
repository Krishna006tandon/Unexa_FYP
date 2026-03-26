const express = require('express');
const { registerUser, authUser, allUsers, resetPassword, verifyEmail } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').post(registerUser).get(protect, allUsers);
router.route('/login').post(authUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/reset-password', resetPassword);

module.exports = router;
