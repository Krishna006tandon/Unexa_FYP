const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const NodeMediaServer = require('node-media-server');
require('dotenv').config();

const LiveStream = require('../models/LiveStream');
const { markLiveStartedByKey, markLiveEndedByKey } = require('../services/streamService');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getNmsConfig() {
  const mediaRoot = process.env.NMS_MEDIA_ROOT || path.join(__dirname, '..', 'uploads', 'nms');
  ensureDir(mediaRoot);

  return {
    logType: 3,
    rtmp: {
      port: parseInt(process.env.NMS_RTMP_PORT || '1935', 10),
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: parseInt(process.env.NMS_HTTP_PORT || '8000', 10),
      mediaroot: mediaRoot,
      allow_origin: '*',
    },
    trans: {
      ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
      tasks: [
        {
          app: 'live',
          hls: true,
          hlsFlags: '[hls_time=2:hls_list_size=6:hls_flags=delete_segments]',
        },
      ],
    },
  };
}

async function ensureMongoConnected() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  const uri =
    process.env.MONGO_URI || 'mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

function parseStreamKey(StreamPath) {
  // StreamPath looks like: /live/<streamKey>
  const parts = (StreamPath || '').split('/');
  return parts[parts.length - 1] || null;
}

async function startNodeMediaServer({ io } = {}) {
  await ensureMongoConnected();

  const nms = new NodeMediaServer(getNmsConfig());

  nms.on('prePublish', async (id, StreamPath, args) => {
    const streamKey = parseStreamKey(StreamPath);
    if (!streamKey) return;
    console.log(`[NMS] prePublish id=${id} path=${StreamPath}`);

    const session = nms.getSession(id);
    const existing = await LiveStream.findOne({ streamKey }).catch(() => null);
    if (!existing) {
      console.log(`[NMS] Rejecting publish (unknown streamKey): ${streamKey}`);
      try {
        session.reject();
      } catch (_) {}
      return;
    }

    const updated = await markLiveStartedByKey(streamKey);
    if (updated && io) io.emit('live:start', { streamId: updated._id.toString(), streamKey });
  });

  nms.on('donePublish', async (id, StreamPath, args) => {
    const streamKey = parseStreamKey(StreamPath);
    if (!streamKey) return;
    console.log(`[NMS] donePublish id=${id} path=${StreamPath}`);

    const updated = await markLiveEndedByKey(streamKey);
    if (updated && io) io.emit('live:end', { streamId: updated._id.toString(), streamKey });
  });

  nms.run();
  console.log(`[NMS] RTMP=${process.env.NMS_RTMP_PORT || 1935} HTTP=${process.env.NMS_HTTP_PORT || 8000}`);
  return nms;
}

module.exports = { startNodeMediaServer };
