const crypto = require('crypto');
const LiveStream = require('../models/LiveStream');

function generateStreamKey() {
  return crypto.randomBytes(16).toString('hex');
}

function getRtmpBase() {
  const configured = (process.env.RTMP_BASE_URL || '').trim();
  if (configured) return configured;
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('RTMP_BASE_URL is not configured (required in production for live streaming)');
  }
  return 'rtmp://localhost/live';
}

function getHlsBase() {
  const configured = (process.env.HLS_BASE_URL || '').trim();
  if (configured) return configured;
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('HLS_BASE_URL is not configured (required in production for live streaming)');
  }
  return 'http://localhost:8000';
}

function buildLivePlaybackUrl(streamKey) {
  // Preferred UX: {PUBLIC_BASE_URL}/live/{streamKey}.m3u8 (backend redirects to NMS index.m3u8)
  if (process.env.PUBLIC_BASE_URL) {
    return `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/live/${streamKey}.m3u8`;
  }
  // Fallback direct to Node-Media-Server output:
  return `${getHlsBase().replace(/\/$/, '')}/live/${streamKey}/index.m3u8`;
}

function buildLiveRtmpUrl(streamKey) {
  // OBS Server: rtmp://host/live  StreamKey: <streamKey>
  // Full URL form: rtmp://host/live/<streamKey>
  return `${getRtmpBase().replace(/\/$/, '')}/${streamKey}`;
}

async function createLiveStream({ userId, title }) {
  const streamKey = generateStreamKey();
  const live = await LiveStream.create({
    userId,
    title: title || 'Live Stream',
    streamKey,
    isLive: false,
    viewerCount: 0,
    startedAt: null,
    endedAt: null,
  });
  return live;
}

async function markLiveStartedByKey(streamKey) {
  return LiveStream.findOneAndUpdate(
    { streamKey },
    { $set: { isLive: true, startedAt: new Date(), endedAt: null } },
    { new: true }
  );
}

async function markLiveEndedByKey(streamKey) {
  return LiveStream.findOneAndUpdate(
    { streamKey },
    { $set: { isLive: false, endedAt: new Date(), viewerCount: 0 } },
    { new: true }
  );
}

async function setViewerCount(streamId, viewerCount) {
  return LiveStream.findByIdAndUpdate(streamId, { $set: { viewerCount } }, { new: true });
}

module.exports = {
  buildLivePlaybackUrl,
  buildLiveRtmpUrl,
  createLiveStream,
  markLiveStartedByKey,
  markLiveEndedByKey,
  setViewerCount,
};
