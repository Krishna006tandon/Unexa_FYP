# UNEXA SuperApp: Project Documentation

## 1. Project Overview
**UNEXA** is a modern, real-time "SuperApp" designed to provide a unified platform for social interaction, communication, and media sharing. Inspired by industry leaders like WhatsApp, Instagram, and YouTube, UNEXA integrates instant messaging, voice/video calling, and media management into a single, seamless user experience.

### Key Features:
- **Instant Messaging**: Real-time text communication with status updates (online/offline).
- **Media Sharing**: Support for uploading and viewing photos, videos, and documents.
- **Voice Messages**: Record and send audio snippets within chats.
- **Audio/Video Calls**: High-quality peer-to-peer calling powered by ZegoCloud.
- **Message Reactions**: Users can react to messages with emojis (Snapchat/Instagram style).
- **Secure Authentication**: JWT-based login and signup system with password encryption.
- **Real-time Notifications**: Instant updates for new messages and calls.

---

## 2. Technical Stack (MERN + Expo)

The project follows a decoupled architecture with a robust backend and a cross-platform mobile frontend.

### Frontend (Mobile Application)
- **Framework**: React Native with Expo (SDK 54).
- **Navigation**: React Navigation (Bottom Tabs & Stack Navigation).
- **State Management**: React Context API for global user and chat state.
- **Networking**: Axios for REST API calls and Socket.io-client for real-time events.
- **UI/UX**: Lucide-react-native icons, React Native Reanimated for smooth transitions, and Expo Blur for modern design aesthetics.
- **Media**: Expo-AV for audio/video playback and Expo-Camera for capturing media.
- **Calling SDK**: ZegoCloud Prebuilt UI Kit for reliable RTC (Real-Time Communication).

### Backend (Server-side API)
- **Runtime**: Node.js.
- **Framework**: Express.js (RESTful API architecture).
- **Real-time Engine**: Socket.io for persistent bi-directional communication.
- **Security**: 
  - **JWT (JSON Web Tokens)**: Secure stateless authentication.
  - **Bcrypt.js**: Salting and hashing passwords.
  - **Helmet & Rate Limiting**: Protection against common web vulnerabilities and Brute-force attacks.

### Database & Storage
- **Database**: MongoDB (NoSQL) for flexible schema design.
- **Object Data Modeling (ODM)**: Mongoose for interacting with MongoDB.
- **Cloud Storage**: AWS S3 (Simple Storage Service) for hosting user-uploaded media (images, audio, documents).
- **File Handling**: Multer (Middleware) for processing multipart/form-data.

---

## 3. System Architecture & Workflow

### A. Authentication Workflow
1. User provides credentials (Email/Password).
2. Backend validates credentials using Bcrypt.
3. Upon success, a JWT is generated and returned to the Mobile App.
4. Mobile App stores the token in `AsyncStorage` for persistent sessions.

### B. Real-time Messaging Workflow (Socket.io)
1. **Connection**: Client establishes a socket connection upon app launch.
2. **Sending**: A user sends a message; the client emits a `send_message` event.
3. **Processing**: The server catches the event, stores the message in MongoDB, and identifies the recipient's socket ID.
4. **Delivery**: The server emits a `receive_message` event to the recipient in real-time.

### C. User Profile & Social Workflow
1. **Profile Management**: Users can update their Profile Photo (via AWS S3) and Bio.
2. **Social Interaction**: Users can follow/unfollow others, creating a social graph stored in MongoDB.
3. **Presence Status**: Real-time "Online/Offline" status and "Last Seen" tracking using Socket.io heartbeats.

### D. Media & Snapchat-style Features
1. **Stories/Status**: Users can upload temporary media (Photos/Videos) as "Stories" that disappear after 24 hours.
2. **View-Once Media**: Option to send images/videos that can only be opened once by the recipient (ephemeral media).
3. **Typing Indicators**: Real-time "Snapchat-style" typing notifications that appear as soon as the user starts composing a message.

### E. Media Upload Workflow
1. User selects a file (Image/Audio/Document).
2. Client sends the file to the `/api/upload` endpoint using Multer.
3. Backend uploads the file to an AWS S3 bucket.
4. S3 returns a public URL, which is then saved in the message object in MongoDB.

### F. Audio/Video Calling Workflow
1. The caller initiates a call via the ZegoCloud UI Kit.
2. A signaling event is sent through Socket.io to notify the receiver.
3. The receiver accepts the call, and a P2P connection is established via ZegoCloud servers for low-latency media streaming.

---

## 4. Development & Deployment Workflow

1. **Local Development**:
   - Backend run via `npm run dev` (Nodemon).
   - Frontend run via `npx expo start` (connecting via Expo Go or Emulator).
2. **Version Control**: Git for collaborative development and feature tracking.
3. **API Documentation**: Structured REST endpoints for Auth, Chats, Messages, and Uploads.
4. **Environment Management**: `.env` files used to manage sensitive keys (DB URI, AWS Keys, JWT Secret).

---
