const LiveStream = require('../models/LiveStream');
const {
  buildLivePlaybackUrl,
  buildLiveRtmpUrl,
  createLiveStream,
  markLiveEndedByKey,
  markLiveStartedByKey,
} = require('../services/streamService');

exports.createLive = async (req, res) => {
  try {
    const { title } = req.body || {};
    const live = await createLiveStream({ userId: req.user._id, title });

    res.json({
      success: true,
      data: {
        _id: live._id,
        userId: live.userId,
        title: live.title,
        streamKey: live.streamKey,
        rtmpUrl: buildLiveRtmpUrl(live.streamKey),
        playbackUrl: buildLivePlaybackUrl(live.streamKey),
        isLive: live.isLive,
        viewerCount: live.viewerCount,
        startedAt: live.startedAt,
        endedAt: live.endedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.startLive = async (req, res) => {
  try {
    const { streamKey } = req.body || {};
    if (!streamKey) return res.status(400).json({ success: false, error: 'streamKey is required' });

    const live = await LiveStream.findOne({ streamKey });
    if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });
    if (live.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }

    const updated = await markLiveStartedByKey(streamKey);
    const io = req.app.get('io');
    if (io && updated) io.emit('live:start', { streamId: updated._id.toString(), streamKey: updated.streamKey });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.endLive = async (req, res) => {
  try {
    const { streamKey } = req.body || {};
    if (!streamKey) return res.status(400).json({ success: false, error: 'streamKey is required' });

    const live = await LiveStream.findOne({ streamKey });
    if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });
    if (live.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }

    const updated = await markLiveEndedByKey(streamKey);
    const io = req.app.get('io');
    if (io && updated) io.emit('live:end', { streamId: updated._id.toString(), streamKey: updated.streamKey });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getActiveLives = async (req, res) => {
  try {
    const lives = await LiveStream.find({ isLive: true })
      .sort({ startedAt: -1 })
      .limit(50)
      .populate('userId', 'username profilePhoto');

    res.json({
      success: true,
      data: lives.map((l) => ({
        _id: l._id,
        userId: l.userId,
        title: l.title,
        isLive: l.isLive,
        viewerCount: l.viewerCount,
        startedAt: l.startedAt,
        playbackUrl: buildLivePlaybackUrl(l.streamKey),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLiveById = async (req, res) => {
  try {
    const live = await LiveStream.findById(req.params.id).populate('userId', 'username profilePhoto');
    if (!live) return res.status(404).json({ success: false, error: 'Live stream not found' });

    const isOwner =
      req.user && live.userId && (live.userId._id || live.userId).toString() === req.user._id.toString();

    res.json({
      success: true,
      data: {
        _id: live._id,
        userId: live.userId,
        title: live.title,
        isLive: live.isLive,
        viewerCount: live.viewerCount,
        startedAt: live.startedAt,
        endedAt: live.endedAt,
        playbackUrl: buildLivePlaybackUrl(live.streamKey),
        ...(isOwner ? { streamKey: live.streamKey, rtmpUrl: buildLiveRtmpUrl(live.streamKey) } : {}),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

