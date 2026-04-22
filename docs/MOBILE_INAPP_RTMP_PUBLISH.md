# Mobile In-App RTMP Publishing (Camera + Screen Share) — No WebRTC

This project supports HLS playback everywhere, and RTMP ingestion for broadcasters.

## Reality check (important)
- **Camera RTMP publishing in-app** is implemented via a native module (`react-native-nodemediaclient`).
- **Screen-share RTMP publishing in-app** is **not implemented yet**. It requires native:
  - Android: MediaProjection + encoder + RTMP muxer
  - iOS: ReplayKit Broadcast Extension + RTMP uploader

Until that native work is added, screen-share from mobile should be done using an RTMP broadcaster app (Larix / Prism / Streamlabs), which is already supported by the “Share Mobile RTMP” button.

---

## 1) Camera RTMP (in-app) — implemented

Screen:
- `F:\\Project\\Unexa_FYP\\frontend\\src\\screens\\MobileBroadcastScreen.js`

Library:
- `react-native-nodemediaclient`

### Build requirement
This **will not work in Expo Go**.
You must use an Expo Dev Client / prebuild build.

### Build steps (recommended)
From `F:\\Project\\Unexa_FYP\\frontend`:
- `npx expo prebuild`
- `npx expo run:android`
- `npx expo run:ios`

Or use EAS Dev Client:
- `eas build --profile development --platform android`
- `eas build --profile development --platform ios`

Then install the dev build on your phone and run Metro (`npm start`) to load JS updates.

---

## 2) Screen-share RTMP (in-app) — planned

## 2) Screen-share RTMP (in-app) — Android implemented (Dev Client)

Android screen-share publishing is implemented using RootEncoder (rtmp-rtsp-stream-client-java) via an Expo config plugin:
- Plugin: `F:\\Project\\Unexa_FYP\\frontend\\plugins\\withScreenShareRtmp.js`
- Screen: `F:\\Project\\Unexa_FYP\\frontend\\src\\screens\\ScreenShareBroadcastScreen.js`

Build requirement: Dev Client (not Expo Go).

## 3) iOS Screen-share RTMP — planned

To build true in-app screen-share RTMP on iOS (no WebRTC), you need native modules:

### Android approach
Already covered via RootEncoder-based module (foreground-only).

### iOS approach
- ReplayKit Broadcast Upload Extension
- Upload encoded frames to RTMP endpoint

If you want, I can implement this in a new native module, but it requires:
- committing iOS/Android native projects (already present)
- choosing a native RTMP SDK or implementing RTMP push pipeline
- extra permissions and store compliance steps
