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

Web viewer UI:
- `http://<BACKEND_HOST>/liveweb/` (plays live + chat + reactions)

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
- `STREAM_NOTIFY_SECRET=<random>` (optional but recommended for real-time status)

If you want mobile broadcasters outside your Wi‑Fi:
- Start RTMP tunnel: `ngrok tcp 1935`
- Set `RTMP_BASE_URL=rtmp://0.tcp.ngrok.io:<port>/live`

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

Real-time “LIVE/ENDED”:
- Configure your local NMS to notify the backend (so Socket.IO can update the app instantly).
- On your streaming PC set env for NMS process:
  - `STREAM_NOTIFY_URL=https://<your-render-backend>/webhook/nms`
  - `STREAM_NOTIFY_SECRET=<same random as backend>`

Mobile broadcasting:
- Use an RTMP broadcaster app (Larix / Prism Live / Streamlabs).
- Paste Server + Stream Key shown in the app’s Live screen.

---

## 5) ngrok URL changes

Free ngrok URLs change on restart.
When it changes:
- update Render `STREAM_BASE_URL`
- redeploy / restart backend (or just update env and restart service)
