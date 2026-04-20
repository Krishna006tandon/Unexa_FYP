const { createMuxClient } = require('../config/mux');
const MuxLiveStream = require('../models/MuxLiveStream');

// Webhook endpoint for Mux -> your server
// - Verifies signature using MUX_WEBHOOK_SECRET
// - Updates Mongo status
// - Emits Socket.IO live:status to update clients in real time
exports.handleMuxWebhook = async (req, res) => {
  try {
    const secret = process.env.MUX_WEBHOOK_SECRET;
    if (!secret) return res.status(500).send('MUX_WEBHOOK_SECRET not configured');

    const mux = createMuxClient();

    const signature = req.headers['mux-signature'] || req.headers['Mux-Signature'];
    if (!signature) return res.status(400).send('Missing mux-signature header');

    // mux.webhooks.unwrap verifies signature and returns the parsed event.
    // It requires the raw request body (Buffer/string) and request headers.
    const rawBody = req.rawBody || req.body;
    const event = mux.webhooks.unwrap(rawBody, req.headers, secret);

    const type = event?.type;
    const liveStreamId = event?.data?.id;

    if (!type || !liveStreamId) return res.status(200).json({ ok: true });

    let nextStatus = null;
    if (type === 'video.live_stream.active') nextStatus = 'live';
    if (type === 'video.live_stream.idle') nextStatus = 'ended';

    if (nextStatus) {
      const updated = await MuxLiveStream.findOneAndUpdate(
        { muxLiveStreamId: liveStreamId },
        { $set: { status: nextStatus, lastWebhookAt: new Date() } },
        { new: true }
      );

      const io = req.app.get('io');
      if (io && updated) {
        io.emit('live:status', {
          muxLiveStreamId: updated.muxLiveStreamId,
          playbackId: updated.playbackId,
          status: updated.status,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[MUX_WEBHOOK] error:', error.message);
    return res.status(400).send('Invalid webhook');
  }
};

