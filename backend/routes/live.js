const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const liveController = require('../controllers/liveController');

const router = express.Router();

// POST /api/live/create
router.post('/create', protect, liveController.createLive);

// Optional helpers for app UX
router.get('/active', liveController.getActiveLives);
router.get('/:id', liveController.getLiveById);

module.exports = router;

