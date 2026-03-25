const express = require('express');
const { registerUser, authUser, allUsers, resetPassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').post(registerUser).get(protect, allUsers);
router.route('/login').post(authUser);
router.post('/reset-password', resetPassword);

module.exports = router;
