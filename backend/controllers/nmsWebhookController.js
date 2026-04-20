const LiveStream = require('../models/LiveStream');
const { markLiveStartedByKey, markLiveEndedByKey } = require('../services/streamService');

function assertSecret(req) {
  const configured = (process.env.STREAM_NOTIFY_SECRET || '').trim();
  if (!configured) return true; // allow if not configured (dev)
  const header = (req.headers['x-stream-notify-secret'] || '').toString();
  return header && header === configured;
}

// NMS -> Backend notify (for real-time status + sockets), used in hybrid mode.
// Body: { streamKey, action: "start" | "end" }
exports.handleNmsNotify = async (req, res) => {
  try {
    if (!assertSecret(req)) return res.status(401).json({ ok: false, error: 'Invalid secret' });

    const { streamKey, action } = req.body || {};
    if (!streamKey || !action) return res.status(400).json({ ok: false, error: 'streamKey and action are required' });

    let updated = null;
    if (action === 'start') updated = await markLiveStartedByKey(streamKey);
    if (action === 'end') updated = await markLiveEndedByKey(streamKey);

    if (updated) {
      const io = req.app.get('io');
      if (io) {
        io.emit('live:status', {
          streamId: updated._id.toString(),
          streamKey: updated.streamKey,
          status: updated.isLive ? 'live' : 'ended',
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      // Ensure stream exists for debugging
      await LiveStream.findOne({ streamKey }).catch(() => null);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[NMS_WEBHOOK] error:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

