const express = require('express');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const liveController = require('../controllers/liveController');

const router = express.Router();

router.post('/create', protect, liveController.createLive);
router.post('/start', protect, liveController.startLive);
router.post('/end', protect, liveController.endLive);
router.get('/config', liveController.getLiveConfig);
router.get('/active', liveController.getActiveLives);
router.get('/:id', optionalProtect, liveController.getLiveById);

module.exports = router;
