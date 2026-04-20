# ngrok Live Streaming Testing (RTMP + HLS) — UNEXA

Use this when you want to test **from a real phone** while your servers run on your laptop/PC.

Security note:
- Do **not** paste your `ngrok authtoken` into chats or commits.
- If you already shared it, **rotate/revoke** it in the ngrok dashboard and add a new one locally.

---

## What you will expose

You need **3 tunnels**:
- Backend API (example: local `http://localhost:5000`)
- RTMP ingest for OBS (local `tcp/1935`)
- HLS playback (local `http://localhost:8000`)

---

## 1) Start backend + streaming locally

From `F:\\Project\\Unexa_FYP`:

0) Install FFmpeg (Windows, terminal):
- `powershell -ExecutionPolicy Bypass -File backend\\scripts\\download-ffmpeg-windows.ps1`
- Then set `FFMPEG_PATH` from the script output (or add FFmpeg to PATH)

1) Backend API:
- `cd backend; npm run dev`

2) Node Media Server:
- `cd backend; npm run streaming`

Make sure FFmpeg is installed and accessible as `ffmpeg` (or set `FFMPEG_PATH`).

---

## 2) Start ngrok tunnels

Open 3 terminals:

1) Backend API tunnel (HTTP):
- `ngrok http 5000`

2) HLS tunnel (HTTP, NMS):
- `ngrok http 8000`

3) RTMP tunnel (TCP):
- `ngrok tcp 1935`

You will get outputs like:
- API: `https://<api-subdomain>.ngrok-free.dev`
- HLS: `https://<hls-subdomain>.ngrok-free.dev`
- RTMP: `tcp://0.tcp.ngrok.io:<port>`

---

## 3) Configure backend env

In `backend/.env` (local machine):

- `PUBLIC_BASE_URL=<API_HTTPS_NGROK_URL>`
- `RTMP_BASE_URL=rtmp://0.tcp.ngrok.io:<port>/live`
- `HLS_BASE_URL=<HLS_HTTPS_NGROK_URL>`

Restart backend after changes.

---

## 4) Configure Expo app API URL (so phone hits your ngrok backend)

Run Expo with:
- PowerShell:
  - `$env:EXPO_PUBLIC_API_URL='<API_HTTPS_NGROK_URL>'; npm start`

Expo reads this through `frontend/app.config.js` → `extra.apiUrl`, and `frontend/src/config/environment.js`.

---

## 5) Go Live (UNEXA)

In the app:
1) `Videos` tab → `Go Live`
2) Tap `Generate Stream Key`
3) Copy:
   - Server URL (ends with `/live`)
   - Stream Key

---

## 6) OBS configuration

OBS → Settings → Stream → Service: **Custom**
- Server: `rtmp://0.tcp.ngrok.io:<port>/live`
- Stream Key: `<streamKey from app>`

Click **Start Streaming**.

---

## 7) Verify playback

You can test in the app by opening the live stream, or directly verify:
- Preferred alias (via backend redirect):
  - `<API_HTTPS_NGROK_URL>/live/<streamKey>.m3u8`
- Direct NMS output:
  - `<HLS_HTTPS_NGROK_URL>/live/<streamKey>/index.m3u8`

If HLS loads but video is black, wait ~3–10 seconds for segments to appear.
