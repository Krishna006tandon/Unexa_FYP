const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');

function storageDriver() {
  return (process.env.STORAGE_DRIVER || 'local').toLowerCase();
}

function randomId(bytes = 12) {
  return crypto.randomBytes(bytes).toString('hex');
}

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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function localPublicUrl(req, relativePathFromUploads) {
  const base = getUploadsBaseUrl(req);
  return `${base}/${relativePathFromUploads.split(path.sep).join('/')}`;
}

function getS3() {
  const endpoint = process.env.S3_ENDPOINT;
  const s3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: endpoint ? new AWS.Endpoint(endpoint) : undefined,
    s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true',
    signatureVersion: 'v4',
  });
  return s3;
}

function getS3Bucket() {
  return process.env.S3_BUCKET;
}

function getS3PublicBaseUrl() {
  // For S3 compatible setups, you typically want a public base like:
  // - https://<bucket>.s3.amazonaws.com
  // - https://<cdn-domain>
  // - https://<minio-domain>/<bucket>
  const base = process.env.S3_PUBLIC_BASE_URL;
  return base ? base.replace(/\/$/, '') : null;
}

async function putObjectFromFile({ key, filePath, contentType, cacheControl }) {
  const s3 = getS3();
  const Bucket = getS3Bucket();
  if (!Bucket) throw new Error('S3_BUCKET is required for STORAGE_DRIVER=s3');

  const Body = fs.createReadStream(filePath);
  await s3
    .upload({
      Bucket,
      Key: key,
      Body,
      ACL: 'public-read',
      ContentType: contentType,
      CacheControl: cacheControl,
    })
    .promise();

  return key;
}

function s3PublicUrl(key) {
  const base = getS3PublicBaseUrl();
  if (!base) return null;
  return `${base}/${key}`;
}

async function uploadFileAndGetUrl({ req, filePath, keyPrefix, filename, contentType, cacheControl }) {
  const driver = storageDriver();
  if (driver === 's3') {
    const key = `${keyPrefix}/${filename}`.replace(/^\/+/, '');
    await putObjectFromFile({ key, filePath, contentType, cacheControl });
    const url = s3PublicUrl(key);
    if (!url) throw new Error('S3_PUBLIC_BASE_URL is required for STORAGE_DRIVER=s3');
    return { key, url };
  }

  // local
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const destDir = path.join(uploadsRoot, keyPrefix);
  ensureDir(destDir);
  const destPath = path.join(destDir, filename);
  fs.renameSync(filePath, destPath);
  const relative = path.join(keyPrefix, filename);
  return { key: relative, url: localPublicUrl(req, relative) };
}

module.exports = {
  storageDriver,
  randomId,
  getPublicBaseUrl,
  uploadFileAndGetUrl,
  localPublicUrl,
  s3PublicUrl,
};

