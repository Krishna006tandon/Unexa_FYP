const express = require('express');
const nmsWebhookController = require('../controllers/nmsWebhookController');

const router = express.Router();

router.post('/nms', nmsWebhookController.handleNmsNotify);

module.exports = router;

