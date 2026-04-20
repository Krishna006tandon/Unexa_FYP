# Production Deployment (Recommended) — UNEXA Video + Live (RTMP/HLS)

You **cannot** reliably run RTMP/HLS on typical single-port PaaS (Render, Vercel). The correct production layout is:

- **Backend API** (Render/VM/K8s): Express + Mongo + Socket.IO + REST
- **Streaming server** (VPS/EC2/Droplet): Node-Media-Server + FFmpeg
- **Storage** for recorded uploads: **S3-compatible** (or your own disk + CDN)

---

## 1) Deploy Backend API (Render)

### A. Service
- Create a **Web Service** from `F:\\Project\\Unexa_FYP\\backend`
- Start command: `npm start`
- Ensure Mongo env is set: `MONGO_URI=...`

### B. Required env
- `PUBLIC_BASE_URL=https://<your-backend-domain>`
- `JWT_SECRET=...`
- `MONGO_URI=...`

### C. Streaming env (point to VPS streaming server)
- `RTMP_BASE_URL=rtmp://<stream-domain-or-ip>/live`
- `HLS_BASE_URL=https://<hls-domain>`

### D. Socket.IO
Backend already runs Socket.IO on the same server; mobile clients connect to `ENVIRONMENT.API_URL` (same as backend URL).

---

## 2) Deploy Streaming Server (VPS)

### A. VM requirements
- Ubuntu 22.04+ (recommended)
- Open ports:
  - `1935/tcp` (RTMP ingest)
  - `8000/tcp` (HLS HTTP) **or** expose via Nginx on `443`

### B. Install FFmpeg
On Ubuntu:
- `sudo apt-get update`
- `sudo apt-get install -y ffmpeg`

### C. Run Node Media Server
Option 1 (simple, without Docker):
1) Copy `F:\\Project\\Unexa_FYP\\backend\\streaming\\nms.js` + `package.json` to the VPS (or deploy the whole backend repo)
2) Install deps: `npm install`
3) Set env:
   - `MONGO_URI=<same mongo as backend>`
   - `NMS_RTMP_PORT=1935`
   - `NMS_HTTP_PORT=8000`
   - `FFMPEG_PATH=ffmpeg`
4) Run: `node streaming/nms.js`

Important:
- `nms.js` **rejects unknown stream keys** by checking Mongo `LiveStream` collection.

### D. TLS (HTTPS) for HLS (recommended)
HLS on iOS often requires HTTPS.

Recommended approach:
- Put Nginx in front:
  - `https://hls.yourdomain.com` → reverse proxy to `http://127.0.0.1:8000`

Nginx notes:
- Allow CORS for `.m3u8` and `.ts`
- Disable aggressive caching for `index.m3u8`

Sample config: `docs/NGINX_HLS_PROXY.conf`

---

## 3) Recorded video uploads (S3-compatible)

If your backend runs on Render, **local disk is ephemeral**. Use `STORAGE_DRIVER=s3`.

Backend env:
- `STORAGE_DRIVER=s3`
- `S3_BUCKET=...`
- `S3_ACCESS_KEY_ID=...`
- `S3_SECRET_ACCESS_KEY=...`
- `S3_REGION=us-east-1`
- `S3_ENDPOINT=` (set for MinIO/Wasabi/DO Spaces; leave empty for AWS)
- `S3_PUBLIC_BASE_URL=https://<public-base-for-your-bucket-or-cdn>`
- Optional: `VIDEO_TRANSCODE_HLS=true` to generate VOD HLS and upload playlist+segments to S3

What gets stored:
- MP4 → `video-assets/<id>/videos/...`
- Thumbnail → `video-assets/<id>/thumbnails/...`
- (Optional) VOD HLS → `video-assets/<id>/hls/<slug>/index.m3u8` + `.ts`

---

## 4) Mobile app (Expo) deployment config

Set your backend URL via:
- `EXPO_PUBLIC_API_URL=https://<your-backend-domain>`

This flows through:
- `frontend/app.config.js` → `extra.apiUrl`
- `frontend/src/config/environment.js` → `ENVIRONMENT.API_URL`

---

## 5) End-to-end checklist

- Backend reachable: `GET https://<backend>/api/test`
- Create live: `POST https://<backend>/api/live/create` (auth)
- OBS:
  - Server: `rtmp://<stream-host>/live`
  - Stream key: `<streamKey>`
- HLS plays:
  - Direct: `https://<hls-host>/live/<streamKey>/index.m3u8`
  - (Optional) alias: `https://<backend>/live/<streamKey>.m3u8`
