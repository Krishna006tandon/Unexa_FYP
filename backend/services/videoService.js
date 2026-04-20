const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { ensureDir, generateThumbnail, transcodeToHls } = require('../utils/ffmpeg');

function getPublicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  return `${proto}://${host}`;
}

function getUploadsBaseUrl(req) {
  return `${getPublicBaseUrl(req)}/uploads`;
}

function shouldTranscodeHls() {
  return (process.env.VIDEO_TRANSCODE_HLS || '').toLowerCase() === 'true';
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

async function createVideoFromUpload({ req, userId, title, description, uploadedFile }) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const videoDir = path.join(uploadsDir, 'videos');
  const thumbDir = path.join(uploadsDir, 'thumbnails');
  const hlsDir = path.join(uploadsDir, 'video-hls');
  ensureDir(videoDir);
  ensureDir(thumbDir);
  ensureDir(hlsDir);

  const fileExt = path.extname(uploadedFile.originalname || '').toLowerCase() || '.mp4';
  let videoFilename = uploadedFile.filename || `video_${Date.now()}`;
  if (!path.extname(videoFilename)) videoFilename += fileExt;
  const finalVideoPath = path.join(videoDir, videoFilename);

  // Multer disk storage may already place the file in a temp destination.
  // Normalize to our videos/ folder.
  fs.renameSync(uploadedFile.path, finalVideoPath);

  const thumbFilename = `${path.parse(videoFilename).name}.jpg`;
  const finalThumbPath = path.join(thumbDir, thumbFilename);
  await generateThumbnail({ inputPath: finalVideoPath, outputPath: finalThumbPath, atSeconds: 1 });

  const uploadsBase = getUploadsBaseUrl(req);
  const videoUrl = `${uploadsBase}/videos/${encodeURIComponent(videoFilename)}`;
  const thumbnailUrl = `${uploadsBase}/thumbnails/${encodeURIComponent(thumbFilename)}`;

  let hlsUrl = null;
  if (shouldTranscodeHls()) {
    const videoIdStub = path.parse(videoFilename).name;
    const outDir = path.join(hlsDir, videoIdStub);
    await transcodeToHls({ inputPath: finalVideoPath, outputDir: outDir });
    hlsUrl = `${uploadsBase}/video-hls/${encodeURIComponent(videoIdStub)}/index.m3u8`;
  }

  const video = await Video.create({
    userId,
    title,
    description: description || '',
    videoUrl,
    hlsUrl,
    thumbnailUrl,
    views: 0,
    likes: 0,
    likedBy: [],
    comments: [],
  });

  return video;
}

module.exports = {
  createVideoFromUpload,
  safeUnlink,
};
