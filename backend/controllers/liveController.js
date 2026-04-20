const { createMuxClient } = require('../config/mux');
const MuxLiveStream = require('../models/MuxLiveStream');

// Creates a new Mux Live Stream and stores it in MongoDB.
// Returns streamKey + rtmpUrl (for OBS) + playbackId (for viewers).
exports.createLive = async (req, res) => {
  try {
    const mux = createMuxClient();
    const { title } = req.body || {};

    // NOTE: Mux API uses playback_policies (playback_policy is deprecated).
    const live = await mux.video.liveStreams.create({
      playback_policies: ['public'],
      new_asset_settings: { playback_policies: ['public'] },
      passthrough: `${req.user._id}`,
    });

    const muxLiveStreamId = live?.id;
    const streamKey = live?.stream_key;
    const rtmpUrl = live?.rtmp_url || 'rtmp://global-live.mux.com/app';
    const playbackId = live?.playback_ids?.[0]?.id;

    if (!muxLiveStreamId || !streamKey || !playbackId) {
      return res.status(500).json({ success: false, error: 'Mux live stream creation failed' });
    }

    const doc = await MuxLiveStream.create({
      userId: req.user._id,
      muxLiveStreamId,
      streamKey,
      playbackId,
      title: title || 'Live Stream',
      status: 'idle',
      lastWebhookAt: null,
    });

    return res.json({
      success: true,
      data: {
        _id: doc._id,
        streamKey,
        rtmpUrl,
        playbackId,
        status: doc.status,
      },
    });
  } catch (error) {
    console.error('[LIVE_CREATE] error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Lists currently live streams (based on webhook-updated status).
exports.getActiveLives = async (req, res) => {
  try {
    const lives = await MuxLiveStream.find({ status: 'live' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'username profilePhoto');

    return res.json({
      success: true,
      data: lives.map((l) => ({
        _id: l._id,
        userId: l.userId,
        title: l.title,
        status: l.status,
        playbackId: l.playbackId,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLiveById = async (req, res) => {
  try {
    const live = await MuxLiveStream.findById(req.params.id).populate('userId', 'username profilePhoto');
    if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });

    const isOwner = req.user && live.userId && (live.userId._id || live.userId).toString() === req.user._id.toString();

    return res.json({
      success: true,
      data: {
        _id: live._id,
        userId: live.userId,
        title: live.title,
        status: live.status,
        playbackId: live.playbackId,
        ...(isOwner ? { streamKey: live.streamKey, rtmpUrl: 'rtmp://global-live.mux.com/app' } : {}),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

