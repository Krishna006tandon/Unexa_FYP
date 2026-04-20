const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getFfmpegPath() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function runFfmpeg(args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    const proc = spawn(ffmpegPath, args, { cwd, windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg failed (code ${code}): ${stderr.slice(-1500)}`));
    });
  });
}

async function generateThumbnail({ inputPath, outputPath, atSeconds = 1 }) {
  ensureDir(path.dirname(outputPath));
  const timestamp = Math.max(0, Number(atSeconds) || 0);
  await runFfmpeg([
    '-y',
    '-ss',
    `${timestamp}`,
    '-i',
    inputPath,
    '-vframes',
    '1',
    '-vf',
    'scale=640:-1',
    outputPath,
  ]);
}

async function transcodeToHls({ inputPath, outputDir, playlistName = 'index.m3u8' }) {
  ensureDir(outputDir);
  const outPlaylist = path.join(outputDir, playlistName);
  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
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
    '4',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    path.join(outputDir, 'seg_%03d.ts'),
    outPlaylist,
  ]);
  return outPlaylist;
}

module.exports = {
  ensureDir,
  generateThumbnail,
  transcodeToHls,
};

