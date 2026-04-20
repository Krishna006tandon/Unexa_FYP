const express = require('express');
const muxWebhookController = require('../controllers/muxWebhookController');

const router = express.Router();

// Mux will POST JSON. We need the raw body for signature verification, so we rely on
// server.js capturing req.rawBody via express.json({ verify }).
router.post('/mux', muxWebhookController.handleMuxWebhook);

module.exports = router;

