const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { ensureDir, generateThumbnail, transcodeToHls } = require('../utils/ffmpeg');
const { storageDriver, randomId, uploadFileAndGetUrl, localPublicUrl, s3PublicUrl } = require('../utils/storage');

function shouldTranscodeHls() {
  return (process.env.VIDEO_TRANSCODE_HLS || '').toLowerCase() === 'true';
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

function safeRmDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (_) {}
}

function contentTypeForExt(ext) {
  const e = (ext || '').toLowerCase();
  if (e === '.m3u8') return 'application/vnd.apple.mpegurl';
  if (e === '.ts') return 'video/mp2t';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}

async function createVideoFromUpload({ req, userId, title, description, uploadedFile, kind }) {
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
  let thumbnailGenerated = false;
  try {
    await generateThumbnail({ inputPath: finalVideoPath, outputPath: finalThumbPath, atSeconds: 1 });
    thumbnailGenerated = true;
  } catch (e) {
    // If ffmpeg isn't available in the environment, allow upload to proceed without thumbnail.
    // This is common on some hosts unless ffmpeg is explicitly installed/provisioned.
    if ((e?.message || '').includes('ENOENT') || (e?.message || '').toLowerCase().includes('ffmpeg')) {
      thumbnailGenerated = false;
    } else {
      throw e;
    }
  }

  const driver = storageDriver();
  const videoPrefix = `video-assets/${randomId(10)}`;

  let videoUrl = null;
  let thumbnailUrl = null;
  let hlsUrl = null;

  if (driver === 's3') {
    const uploadedVideo = await uploadFileAndGetUrl({
      req,
      filePath: finalVideoPath,
      keyPrefix: `${videoPrefix}/videos`,
      filename: videoFilename,
      contentType: contentTypeForExt(fileExt),
      cacheControl: 'public, max-age=31536000, immutable',
    });
    videoUrl = uploadedVideo.url;

    if (thumbnailGenerated) {
      const uploadedThumb = await uploadFileAndGetUrl({
        req,
        filePath: finalThumbPath,
        keyPrefix: `${videoPrefix}/thumbnails`,
        filename: thumbFilename,
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      thumbnailUrl = uploadedThumb.url;
    } else {
      thumbnailUrl = null;
    }
  } else {
    // Local URLs
    videoUrl = localPublicUrl(req, path.join('videos', videoFilename));
    thumbnailUrl = thumbnailGenerated ? localPublicUrl(req, path.join('thumbnails', thumbFilename)) : null;
  }

  if (shouldTranscodeHls()) {
    const videoIdStub = path.parse(videoFilename).name;
    const outDir = path.join(hlsDir, videoIdStub);
    await transcodeToHls({ inputPath: finalVideoPath, outputDir: outDir });

    if (driver === 's3') {
      const files = fs.readdirSync(outDir);
      for (const f of files) {
        const fp = path.join(outDir, f);
        const ext = path.extname(f);
        const ct = contentTypeForExt(ext);
        const cacheControl =
          ext === '.m3u8' ? 'public, max-age=5' : 'public, max-age=31536000, immutable';
        await uploadFileAndGetUrl({
          req,
          filePath: fp,
          keyPrefix: `${videoPrefix}/hls/${videoIdStub}`,
          filename: f,
          contentType: ct,
          cacheControl,
        });
      }
      const playlistKey = `${videoPrefix}/hls/${videoIdStub}/index.m3u8`.replace(/^\/+/, '');
      const playlistUrl = s3PublicUrl(playlistKey);
      if (!playlistUrl) throw new Error('S3_PUBLIC_BASE_URL is required for STORAGE_DRIVER=s3');
      hlsUrl = playlistUrl;

      safeRmDir(outDir);
    } else {
      hlsUrl = localPublicUrl(req, path.join('video-hls', videoIdStub, 'index.m3u8'));
    }
  }

  const video = await Video.create({
    userId,
    kind: kind === 'reel' ? 'reel' : 'long',
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

  // Cleanup local source files when using S3 driver
  if (driver === 's3') {
    safeUnlink(finalVideoPath);
    safeUnlink(finalThumbPath);
  }

  return video;
}

module.exports = {
  createVideoFromUpload,
  safeUnlink,
};
