const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const NodeMediaServer = require('node-media-server');
require('dotenv').config();

const LiveStream = require('../models/LiveStream');
const { markLiveStartedByKey, markLiveEndedByKey } = require('../services/streamService');
console.log('[NMS] Booting...');
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function tryFindBundledFfmpeg() {
  try {
    // Looks for workspace-downloaded FFmpeg: <repo>/tmp/ffmpeg/**/bin/ffmpeg.exe
    const repoRoot = path.join(__dirname, '..', '..');
    const ffmpegRoot = path.join(repoRoot, 'tmp', 'ffmpeg');
    if (!fs.existsSync(ffmpegRoot)) return null;

    const stack = [ffmpegRoot];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile() && entry.name.toLowerCase() === 'ffmpeg.exe') return full;
      }
    }

    return null;
  } catch (_) {
    return null;
  }
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const bundled = tryFindBundledFfmpeg();
  if (bundled) return bundled;
  return 'ffmpeg';
}

function getNmsConfig() {
  // Default to backend/media for easier local debugging.
  const mediaRoot = process.env.NMS_MEDIA_ROOT || path.join(__dirname, '..', 'media');
  ensureDir(mediaRoot);
  ensureDir(path.join(mediaRoot, 'live'));

  return {
    logType: 3,
    rtmp: {
      port: parseInt(process.env.NMS_RTMP_PORT || '1935', 10),
      chunk_size: 60000,
      gop_cache: false,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: parseInt(process.env.NMS_HTTP_PORT || '8000', 10),
      mediaroot: mediaRoot,
      allow_origin: '*',
    },
    trans: {
      // Node-Media-Server v4 uses `trans` to generate HLS.
      // DO NOT hardcode a Windows path with backslashes, it breaks JS string parsing.
      ffmpeg: resolveFfmpegPath(),
      tasks: [
        {
          app: 'live',
          hls: true,
          mp4: false,
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

  const config = getNmsConfig();
  const ffmpegPath = config?.trans?.ffmpeg;
  const ffmpegLooksOk = ffmpegPath === 'ffmpeg' ? true : fs.existsSync(ffmpegPath);
  console.log('[NMS] FFmpeg:', ffmpegPath, ffmpegLooksOk ? '' : '(NOT FOUND)');
  console.log('[NMS] Media root:', config?.http?.mediaroot);

  const nms = new NodeMediaServer(config);

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
      } catch (_) { }
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
startNodeMediaServer();
