# Streaming (Option 2) — Laptop as RTMP/HLS Server (Free)

This setup keeps your backend on Render (or any cloud) but runs the **streaming server** (RTMP ingest + HLS output) on your **laptop**.

## What you will run where

- **Cloud backend** (`https://unexa-fyp.onrender.com`)
  - API + DB + Socket.IO
  - Creates `streamKey`
  - Serves viewer alias: `/live/<streamKey>.m3u8` (redirects to your laptop’s HLS)
  - Receives NMS start/end notifications: `/webhook/nms`

- **Your laptop**
  - Node-Media-Server (RTMP `1935`)
  - HLS HTTP server (`8000`) serving `/live/<streamKey>/index.m3u8`

## Requirements

- Your laptop must be reachable from the internet (port-forwarding).
- A free dynamic DNS hostname (DuckDNS / No-IP).
- Router port-forwarding and Windows Firewall rules.

## Step 1 — Dynamic DNS (free)

Create a hostname, example:

- `unexa-stream.duckdns.org`

## Step 2 — Router Port Forwarding

Forward these ports **to your laptop LAN IP** (example `192.168.29.104`):

- TCP `1935` -> `192.168.29.104:1935` (RTMP ingest from OBS)
- TCP `8000` -> `192.168.29.104:8000` (HLS playback for viewers)

## Step 3 — Windows Firewall

Allow inbound on:

- TCP `1935`
- TCP `8000`

## Step 4 — Configure Cloud Backend (Render environment variables)

Set these on your Render backend service:

- `LIVE_PROVIDER=local`
- `PUBLIC_BASE_URL=https://unexa-fyp.onrender.com`
- `RTMP_BASE_URL=rtmp://unexa-stream.duckdns.org/live`
- `HLS_BASE_URL=http://unexa-stream.duckdns.org:8000`
- `STREAM_NOTIFY_SECRET=<generate_a_random_secret>`

Redeploy the Render service after updating env vars.

## Step 5 — Configure Laptop NMS process (local env vars)

On your laptop where you run `npm run streaming`, set:

- `STREAM_NOTIFY_URL=https://unexa-fyp.onrender.com/webhook/nms`
- `STREAM_NOTIFY_SECRET=<same_as_cloud_backend>`
- `NMS_RTMP_PORT=1935`
- `NMS_HTTP_PORT=8000`

Optional:

- `NMS_MEDIA_ROOT=F:\\Project\\Unexa_FYP\\backend\\media`
- `FFMPEG_PATH=F:\\Project\\Unexa_FYP\\tmp\\ffmpeg\\...\\bin\\ffmpeg.exe`

## Step 6 — Start streaming server on laptop

From `F:\\Project\\Unexa_FYP\\backend`:

- `npm run streaming`

You should see logs like:

- `[NMS] RTMP=1935 HTTP=8000`
- HLS segments created under `backend\\media\\live\\<streamKey>\\`

## Step 7 — Go Live from the app

When you press **Go Live**, you will receive:

- `rtmpUrl` like `rtmp://unexa-stream.duckdns.org/live/<streamKey>` (or base + streamKey)
- `streamKey`

Configure OBS:

- Server: `rtmp://unexa-stream.duckdns.org/live`
- Stream Key: `<streamKey>`

## Step 8 — Viewers play via cloud alias

Viewer playback should hit:

- `https://unexa-fyp.onrender.com/live/<streamKey>.m3u8`

Which redirects to:

- `http://unexa-stream.duckdns.org:8000/live/<streamKey>/index.m3u8`

## Notes / gotchas

- If viewers get 404:
  - OBS may not be streaming yet, OR
  - Port forwarding / firewall is blocking, OR
  - `HLS_BASE_URL` is wrong.
- iOS can block `http://` HLS due to ATS. Android usually works.
  - For iOS-friendly playback, you’ll need HTTPS in front of `:8000` (not covered here).

