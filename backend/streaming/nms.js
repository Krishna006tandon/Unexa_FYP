const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const NodeMediaServer = require('node-media-server');
require('dotenv').config();
const net = require('net');
const { spawn } = require('child_process');

async function notifyBackend({ action, streamKey }) {
  const url = (process.env.STREAM_NOTIFY_URL || '').trim();
  if (!url) return;
  const secret = (process.env.STREAM_NOTIFY_SECRET || '').trim();
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { 'x-stream-notify-secret': secret } : {}),
      },
      body: JSON.stringify({ action, streamKey }),
    });
  } catch (e) {
    console.log('[NMS] notifyBackend failed:', e.message);
  }
}

const LiveStream = require('../models/LiveStream');
const { markLiveStartedByKey, markLiveEndedByKey } = require('../services/streamService');

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
    // Serve generated HLS files (and any other static media under mediaRoot)
    static: {
      router: '/',
      root: mediaRoot,
    },
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
  };
}

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (err) => reject(err));
    tester.once('listening', () => tester.close(() => resolve()));
    tester.listen(port, '0.0.0.0');
  });
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

function buildLocalRtmpUrl({ rtmpPort, streamKey }) {
  return `rtmp://127.0.0.1:${rtmpPort}/live/${streamKey}`;
}

function startHlsFfmpeg({ ffmpegPath, inputRtmpUrl, outputDir }) {
  ensureDir(outputDir);
  const playlistPath = path.join(outputDir, 'index.m3u8');
  const segmentPattern = path.join(outputDir, 'seg_%03d.ts');

  const args = [
    '-hide_banner',
    '-y',
    '-i',
    inputRtmpUrl,
    '-preset',
    'veryfast',
    '-g',
    '48',
    '-sc_threshold',
    '0',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-ar',
    '48000',
    '-b:a',
    '128k',
    '-f',
    'hls',
    '-hls_time',
    '2',
    '-hls_list_size',
    '6',
    '-hls_flags',
    'delete_segments',
    '-hls_segment_filename',
    segmentPattern,
    playlistPath,
  ];

  const proc = spawn(ffmpegPath, args, { windowsHide: true });
  proc.stderr.on('data', (d) => {
    const line = d.toString();
    if (line.trim()) console.log('[FFMPEG]', line.trim());
  });
  proc.on('close', (code) => console.log('[FFMPEG] exited', code));
  return proc;
}

async function startNodeMediaServer({ io } = {}) {
  console.log('[NMS] Booting...');
  await ensureMongoConnected();

  const config = getNmsConfig();
  const ffmpegPath = resolveFfmpegPath();
  const ffmpegLooksOk = ffmpegPath === 'ffmpeg' ? true : fs.existsSync(ffmpegPath);
  console.log('[NMS] FFmpeg:', ffmpegPath, ffmpegLooksOk ? '' : '(NOT FOUND)');
  console.log('[NMS] Media root:', config?.http?.mediaroot);

  // Fail fast with a readable message instead of crashing later with EADDRINUSE.
  try {
    await assertPortAvailable(config.rtmp.port);
    await assertPortAvailable(config.http.port);
  } catch (e) {
    console.error(`[NMS] Port not available: ${e.message}`);
    console.error(`[NMS] If you already have an NMS process running, stop it or change NMS_HTTP_PORT/NMS_RTMP_PORT.`);
    process.exit(1);
  }

  const nms = new NodeMediaServer(config);

  // streamKey -> ffmpeg proc
  const hlsProcs = new Map();

  // NOTE: Node-Media-Server v4 emits a single `session` object for these events.
  nms.on('prePublish', async (session) => {
    const streamKey = parseStreamKey(session?.streamPath);
    if (!streamKey) return;
    console.log(`[NMS] prePublish id=${session.id} path=${session.streamPath}`);

    const existing = await LiveStream.findOne({ streamKey }).catch(() => null);
    if (!existing) {
      console.log(`[NMS] Rejecting publish (unknown streamKey): ${streamKey}`);
      try {
        session.close();
      } catch (_) { }
      return;
    }

    const updated = await markLiveStartedByKey(streamKey);
    if (updated && io) io.emit('live:start', { streamId: updated._id.toString(), streamKey });
    await notifyBackend({ action: 'start', streamKey });
  });

  // Confirms the RTMP publish completed; HLS muxing should start shortly after this.
  nms.on('postPublish', (session) => {
    const streamKey = parseStreamKey(session?.streamPath);
    console.log(`[NMS] postPublish id=${session.id} path=${session.streamPath}`);
    if (!streamKey) return;

    const outDir = path.join(config.http.mediaroot, 'live', streamKey);
    console.log(`[NMS] HLS expected at: ${path.join(outDir, 'index.m3u8')}`);

    if (hlsProcs.has(streamKey)) return;
    const input = buildLocalRtmpUrl({ rtmpPort: config.rtmp.port, streamKey });
    console.log('[NMS] Starting FFmpeg HLS:', input);
    const proc = startHlsFfmpeg({ ffmpegPath, inputRtmpUrl: input, outputDir: outDir });
    hlsProcs.set(streamKey, proc);
  });

  nms.on('donePublish', async (session) => {
    const streamKey = parseStreamKey(session?.streamPath);
    if (!streamKey) return;
    console.log(`[NMS] donePublish id=${session.id} path=${session.streamPath}`);

    const proc = hlsProcs.get(streamKey);
    if (proc) {
      try {
        proc.kill('SIGINT');
      } catch (_) {}
      hlsProcs.delete(streamKey);
    }

    const updated = await markLiveEndedByKey(streamKey);
    if (updated && io) io.emit('live:end', { streamId: updated._id.toString(), streamKey });
    await notifyBackend({ action: 'end', streamKey });
  });

  nms.run();
  console.log(`[NMS] RTMP=${process.env.NMS_RTMP_PORT || 1935} HTTP=${process.env.NMS_HTTP_PORT || 8000}`);
  return nms;
}

module.exports = { startNodeMediaServer };

// If executed directly (recommended for option-2 local streaming), start immediately.
if (require.main === module) {
  startNodeMediaServer().catch((e) => {
    console.error('[NMS] Failed to start:', e.message);
    process.exit(1);
  });
}
