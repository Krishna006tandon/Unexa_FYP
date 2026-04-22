const { createMuxClient } = require('../config/mux');
const MuxLiveStream = require('../models/MuxLiveStream');
const LiveStream = require('../models/LiveStream');
const { createLiveStream, buildLiveRtmpUrl, buildLivePlaybackUrl } = require('../services/streamService');

function liveProvider() {
  return (process.env.LIVE_PROVIDER || 'local').toLowerCase();
}

function buildHybridPlaybackUrl(streamKey) {
  const base = (process.env.STREAM_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;
  return `${base}/live/${streamKey}/index.m3u8`;
}

// Creates a new Mux Live Stream and stores it in MongoDB.
// Returns streamKey + rtmpUrl (for OBS) + playbackId (for viewers).
exports.createLive = async (req, res) => {
  try {
    const { title } = req.body || {};

    if (liveProvider() === 'mux') {
      const mux = createMuxClient();

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
          playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          status: doc.status,
          provider: 'mux',
        },
      });
    }

    // local/hybrid: backend generates streamKey; broadcaster streams to their local NMS.
    const live = await createLiveStream({ userId: req.user._id, title: title || 'Live Stream' });

    // Prefer PUBLIC_BASE_URL based viewer URL (backend redirect), to avoid leaking internal/ngrok URLs to clients.
    const playbackUrl = buildLivePlaybackUrl(live.streamKey) || buildHybridPlaybackUrl(live.streamKey);
    const rtmpUrl = buildLiveRtmpUrl(live.streamKey);

    return res.json({
      success: true,
      data: {
        _id: live._id,
        streamKey: live.streamKey,
        rtmpUrl,
        playbackUrl,
        status: 'idle',
        provider: 'local',
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
    if (liveProvider() === 'mux') {
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
          playbackUrl: `https://stream.mux.com/${l.playbackId}.m3u8`,
          provider: 'mux',
        })),
      });
    }

    const lives = await LiveStream.find({ isLive: true })
      .sort({ startedAt: -1 })
      .limit(50)
      .populate('userId', 'username profilePhoto');

    return res.json({
      success: true,
      data: lives.map((l) => ({
        _id: l._id,
        userId: l.userId,
        title: l.title,
        status: l.isLive ? 'live' : 'idle',
        viewerCount: l.viewerCount || 0,
        startedAt: l.startedAt,
        playbackUrl: buildLivePlaybackUrl(l.streamKey) || buildHybridPlaybackUrl(l.streamKey),
        provider: 'local',
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLiveById = async (req, res) => {
  try {
    if (liveProvider() === 'mux') {
      const live = await MuxLiveStream.findById(req.params.id).populate('userId', 'username profilePhoto');
      if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });

      const isOwner =
        req.user && live.userId && (live.userId._id || live.userId).toString() === req.user._id.toString();

      return res.json({
        success: true,
        data: {
          _id: live._id,
          userId: live.userId,
          title: live.title,
          status: live.status,
          playbackId: live.playbackId,
          playbackUrl: `https://stream.mux.com/${live.playbackId}.m3u8`,
          provider: 'mux',
          ...(isOwner ? { streamKey: live.streamKey, rtmpUrl: 'rtmp://global-live.mux.com/app' } : {}),
        },
      });
    }

    const live = await LiveStream.findById(req.params.id).populate('userId', 'username profilePhoto');
    if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });

    const isOwner =
      req.user && live.userId && (live.userId._id || live.userId).toString() === req.user._id.toString();

    return res.json({
      success: true,
      data: {
        _id: live._id,
        userId: live.userId,
        title: live.title,
        status: live.isLive ? 'live' : 'idle',
        playbackUrl: buildLivePlaybackUrl(live.streamKey) || buildHybridPlaybackUrl(live.streamKey),
        provider: 'local',
        ...(isOwner ? { streamKey: live.streamKey, rtmpUrl: buildLiveRtmpUrl(live.streamKey) } : {}),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
