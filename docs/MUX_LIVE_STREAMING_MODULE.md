# LIVE STREAMING MODULE (Mux) — React Native (Expo) + Node/Express

Goal: replace local RTMP/NMS streaming with Mux cloud live streaming.

---

## Backend (Express)

### 1) Install
From `F:\\Project\\Unexa_FYP\\backend`:
- `npm install @mux/mux-node dotenv`

### 2) Environment variables (Render/local)
Add these to backend env:
- `MUX_TOKEN_ID=...`
- `MUX_TOKEN_SECRET=...`
- `MUX_WEBHOOK_SECRET=...` (Mux dashboard → Webhooks → signing secret)

### 3) Routes
- `POST /api/live/create` (auth)
  - Creates a Mux live stream
  - Stores in Mongo (`MuxLiveStream`)
  - Returns:
    - `rtmpUrl` (OBS server url)
    - `streamKey`
    - `playbackId`

- `GET /api/live/active`
  - Lists streams with `status=live`

- `GET /api/live/:id`
  - Returns stream details (+ `streamKey` only for owner token)

- `POST /webhook/mux`
  - Mux webhooks update status and emits Socket.IO `live:status`

### 4) Webhook events handled
- `video.live_stream.active` → status `live`
- `video.live_stream.idle` → status `ended`

Server emits:
- `live:status` `{ playbackId, status }`

---

## Frontend (Expo)

### Screens
- `frontend/src/screens/LiveScreen.js`
  - “Go Live” button → calls backend `/api/live/create`
  - Shows OBS server + stream key
  - Preview button → opens Watch screen

- `frontend/src/screens/WatchLiveScreen.js`
  - Plays `https://stream.mux.com/${playbackId}.m3u8` using `expo-av`
  - Live badge updates from Socket.IO `live:status` (webhook-driven)

### OBS setup
- Server: `rtmp://global-live.mux.com/app`
- Stream Key: `<streamKey from /api/live/create>`

---

## Local run checklist

1) Backend:
- set `MUX_*` env vars
- run: `cd backend; npm run dev`

2) Expose webhook (local dev):
- use ngrok: `ngrok http 5000`
- in Mux dashboard webhook URL set:
  - `https://<ngrok-domain>/webhook/mux`

3) Expo:
- set: `EXPO_PUBLIC_API_URL=https://<your-backend-domain>`
- run: `cd frontend; npm start`

4) Test:
- App → Videos → Go Live (Mux) → create
- OBS → start streaming using provided key
- Wait for webhook `video.live_stream.active`
- App → Watch screen should start playing

