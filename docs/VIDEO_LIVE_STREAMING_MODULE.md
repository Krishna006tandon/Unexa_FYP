# UNEXA Video + Live Streaming Module (RTMP + HLS)

This module adds **live streaming (YouTube-style)** + **video uploads** with **HLS playback** and **real-time chat/reactions**.

Core constraints:
- **No WebRTC**
- **Live ingest:** RTMP (OBS / RTMP app)
- **Playback:** HLS (`.m3u8`)
- **Realtime:** Socket.IO

---

## Architecture

### Live streaming
1. App: `POST /api/live/create` → gets `streamKey`
2. Broadcaster uses OBS/RTMP app:
   - Server: `rtmp://<STREAM_HOST>/live`
   - Stream Key: `<streamKey>`
3. **Node Media Server** receives RTMP and runs FFmpeg HLS muxing
4. Viewers play HLS:
   - Preferred alias: `http://<API_HOST>/live/<streamKey>.m3u8` (redirects)
   - NMS direct: `http://<STREAM_HOST>:8000/live/<streamKey>/index.m3u8`
5. Viewers join Socket.IO room `live_<streamId>` for:
   - chat (`live:chat`)
   - reactions (`live:reaction`)
   - viewer count (`live:viewers`)

### Video uploads
1. App uploads video via `multipart/form-data` → `POST /api/video/upload`
2. Backend stores MP4 to `backend/uploads/videos/`
3. FFmpeg generates thumbnail to `backend/uploads/thumbnails/`
4. Optional: FFmpeg generates VOD HLS to `backend/uploads/video-hls/<slug>/index.m3u8`
5. Video appears in `GET /api/video/feed` and can be played via HLS or MP4

---

## Backend setup

### Prerequisites
- MongoDB running / connection string set in `backend/.env`
- **FFmpeg installed** and available as `ffmpeg` (or set `FFMPEG_PATH`)

### Environment variables (backend)
See `backend/.env.example` for all keys. Important ones:
- `ENABLE_NMS=true` to run Node Media Server inside `backend/server.js` (local dev)
- `RTMP_BASE_URL=rtmp://localhost/live`
- `HLS_BASE_URL=http://localhost:8000`
- `PUBLIC_BASE_URL=http://localhost:5000` (used to build `/uploads/...` URLs)
- `VIDEO_TRANSCODE_HLS=false` (set `true` for VOD HLS generation)

### Run (local dev)
From `F:\\Project\\Unexa_FYP`:
- Backend API: `cd backend; npm run dev`
- Node Media Server (separate process): `cd backend; npm run streaming`

### Test from phone (ngrok)
See `docs/NGROK_LIVE_TESTING.md`.

### Production deployment
See `docs/DEPLOYMENT_PRODUCTION_STREAMING.md`.

If you set `ENABLE_NMS=true`, the API server can start NMS automatically, but you still must expose ports `1935` and `8000` on your machine.

---

## Node Media Server (NMS)

Config is in `backend/streaming/nms.js`.
- RTMP port: `1935`
- HTTP (HLS) port: `8000`
- HLS output: `live/<streamKey>/index.m3u8` under NMS media root

Notes:
- Most PaaS providers (including Render) won’t expose RTMP + extra HTTP ports on the same web service.
- For production, run NMS + FFmpeg on a separate **streaming server/VPS** and point the app at it via `RTMP_BASE_URL` + `HLS_BASE_URL`.

---

## API

### Live
- `POST /api/live/create` (auth) → `{ streamKey, rtmpUrl, playbackUrl, ... }`
- `POST /api/live/start` (auth) → marks stream live (usually driven by NMS `prePublish`)
- `POST /api/live/end` (auth) → marks stream ended (usually driven by NMS `donePublish`)
- `GET /api/live/active` → active live list with `playbackUrl`
- `GET /api/live/:id` → live details (includes `streamKey` only for owner token)

### Video
- `POST /api/video/upload` (auth, `video` field) → creates Video + thumbnail
- `GET /api/video/:id` → returns Video (use `?incrementView=true`)
- `GET /api/video/feed?page=1&limit=10`
- `GET /api/video/search?q=...`
- `POST /api/video/like` (auth) → toggles like
- `POST /api/video/comment` (auth) → adds comment

Static media:
- `GET /uploads/videos/<file>.mp4`
- `GET /uploads/thumbnails/<file>.jpg`
- `GET /uploads/video-hls/<slug>/index.m3u8` (if enabled)

---

## Socket.IO events

Client → server:
- `live:join` `{ streamId, userId, username }`
- `live:leave` `{ streamId, username }`
- `live:chat` `{ streamId, userId, username, message }`
- `live:reaction` `{ streamId, userId, emoji }`

Server → client:
- `live:start` `{ streamId, streamKey }` (emitted when publish starts)
- `live:end` `{ streamId, streamKey }` (emitted when publish ends)
- `live:viewers` `{ streamId, viewerCount }`
- `live:chat` `{ streamId, username, message, createdAt, system? }`
- `live:reaction` `{ streamId, emoji, createdAt }`

---

## Frontend (Expo)

Entry is the bottom tab `Videos`, now wired to a dedicated stack:
- `VideoHomeScreen`
- `LiveListScreen`
- `GoLiveScreen`
- `LiveStreamScreen`
- `VideoFeedScreen`
- `UploadVideoScreen`
- `VideoPlayerScreen`

Playback uses `expo-av` Video and supports `.m3u8` (HLS) or MP4 URLs.
