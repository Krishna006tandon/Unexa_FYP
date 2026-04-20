# Hybrid Live Streaming (Free Demo) — NMS+FFmpeg (Local) + ngrok + Render Backend

Goal:
- OBS publishes to your **local** PC (RTMP)
- FFmpeg generates HLS on your PC
- ngrok makes HLS public
- Render backend generates `streamKey` + stores metadata + returns **public playbackUrl**

---

## 1) Local streaming PC (NMS + FFmpeg)

From `F:\\Project\\Unexa_FYP\\backend`:
- `npm run streaming`

HLS path:
- `F:\\Project\\Unexa_FYP\\backend\\media\\live\\<streamKey>\\index.m3u8`

HLS URL (local):
- `http://localhost:8000/live/<streamKey>/index.m3u8`

Browser note:
- Chrome/Edge don’t play HLS natively. Use Safari/VLC, or open `http://localhost:8000/player.html`.

---

## 2) ngrok (public HLS URL)

On the same PC:
- `ngrok http 8000`

You get:
- `https://<hls-ngrok>.ngrok-free.dev`

So public playback becomes:
- `https://<hls-ngrok>.ngrok-free.dev/live/<streamKey>/index.m3u8`

---

## 3) Render backend env

Set these env vars on Render backend:
- `LIVE_PROVIDER=local`
- `STREAM_BASE_URL=https://<hls-ngrok>.ngrok-free.dev`
- `RTMP_BASE_URL=rtmp://192.168.29.104/live` (your PC LAN IP; used only to show OBS instructions)

---

## 4) App flow

1) App → `POST /api/live/create`
2) Backend returns:
   - `streamKey`
   - `playbackUrl` (ngrok public)
3) OBS:
   - Server: `rtmp://192.168.29.104/live`
   - Stream Key: `<streamKey>`
4) Viewers play `playbackUrl` in app

---

## 5) ngrok URL changes

Free ngrok URLs change on restart.
When it changes:
- update Render `STREAM_BASE_URL`
- redeploy / restart backend (or just update env and restart service)

