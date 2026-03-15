# UNEXA SuperApp Architecture & Documentation

## 1. Project Folder Structure

```
/unexa
│
├── /backend
│   ├── /config          # Database and environment configurations
│   ├── /controllers     # Logic for handling requests
│   ├── /middlewares     # Auth, rate limiting, file upload
│   ├── /models          # Mongoose schemas
│   ├── /routes          # Express REST API routes
│   ├── /sockets         # Socket.io event handlers
│   ├── /utils           # Helper functions (S3 upload, hashing)
│   ├── .env.example
│   ├── package.json
│   └── server.js        # Main entry point
│
├── /frontend
│   ├── /assets
│   ├── /src
│   │   ├── /components  # Reusable UI (GlassCard, CustomButton)
│   │   ├── /navigation  # React Navigation setup
│   │   ├── /screens     # Home, Chat, Profile, Stream, etc.
│   │   ├── /services    # API calls, Socket client
│   │   ├── /store       # State management (Zustand/Redux)
│   │   ├── /theme       # Colors, Typography, Spacing patterns
│   │   └── /utils       # Helpers
│   ├── App.js           # Expo App Entry
│   ├── app.json         # Expo config
│   ├── babel.config.js
│   └── package.json
│
└── /docs                # Architecture and API docs.
```

## 2. Database Schema (MongoDB / Mongoose)

### **User**
- `_id`, `username`, `email`, `passwordHash`, `profilePhoto`, `bio`
- `followers` (Array of ObjectIds), `following` (Array of ObjectIds)
- `pushToken`, `isOnline`, `lastSeen`, `createdAt`

### **Post** (Social Feed)
- `_id`, `userId` (Ref: User), `caption`, `mediaUrls` (Array of Strings)
- `likesCount`, `commentsCount`
- `createdAt`

### **Comment**
- `_id`, `postId` (Ref: Post) or `videoId` (Ref: Video)
- `userId` (Ref: User), `text`, `createdAt`

### **Story / Snap**
- `_id`, `userId` (Ref: User), `mediaUrl`, `mediaType` (image/video)
- `expiresAt` (TTL Index: 24 hours), `viewers` (Array of ObjectIds)
- `createdAt`

### **Chat & Message**
- **Chat**: `_id`, `isGroup`, `participants` (Array of Ref: User), `groupName`, `lastMessage`
- **Message**: `_id`, `chatId` (Ref: Chat), `senderId` (Ref: User), `content`, `mediaUrl`, `messageType` (text/image/voice), `readBy` (Array)

### **Video (Stream Module)**
- `_id`, `userId` (Ref: User), `videoUrl`, `thumbnailUrl`, `title`, `description`
- `viewsCount`, `likesCount`

### **Notification**
- `_id`, `userId` (Recipient), `actorId` (Sender), `type` (like, comment, follow, reply, message)
- `referenceId` (Post/Video/Story ID), `isRead`, `createdAt`

---

## 3. API Structure (REST API)

### **Auth routes (`/api/auth`)**
- `POST /register`
- `POST /login` (Returns JWT)
- `POST /verify-otp`

### **User routes (`/api/users`)**
- `GET /:id` - Get profile
- `PUT /:id` - Update profile
- `POST /:id/follow` - Follow/unfollow user
- `GET /search?q=` - Search users

### **Feed routes (`/api/feed`)**
- `GET /` - Get timeline (Paginated)
- `POST /` - Create post
- `POST /:id/like` - Like/Unlike post
- `POST /:id/comment` - Add comment

### **Chat routes (`/api/chats`)**
- `GET /` - List user's chats
- `POST /` - Create 1-on-1 or group chat
- `GET /:id/messages` - Get chat messages (paginated)

### **Story routes (`/api/stories`)**
- `GET /` - Get active stories from following
- `POST /` - Upload story (auto-deletes in 24h)
- `POST /:id/view` - Mark story as viewed

### **Stream/Video routes (`/api/videos`)**
- `GET /` - Get video feed (Shorts style)
- `POST /` - Upload video

### **Notification routes (`/api/notifications`)**
- `GET /` - Get user notifications
- `PUT /:id/read` - Mark read

---

## 4. Real-time Communication (Socket.IO)

- `connection`: Authenticate user using JWT, join `userId` room.
- `join_chat`: Join specific `chatId` room.
- `send_message`: Broadcast message to `chatId` room.
- `typing`: Broadcast typing status to `chatId` room.
- `online_status`: Emit when user connects/disconnects.
- `notification`: Emit real-time notification to `userId` room.

---

## 5. Deployment Instructions

### Backend (Render / Docker)
1. Provide a `Dockerfile` for the Node app.
2. Push to GitHub.
3. Connect repository to Render as a Web Service.
4. Set Environment Variables in Render dashboard.
5. Setup an AWS S3 bucket for media uploads, and obtain credentials.

### Database (MongoDB Atlas)
1. Create a cluster on MongoDB Atlas.
2. Setup Network Access (allow IP `0.0.0.0/0` for Render).
3. Create database user and obtain connection URI.

### Frontend (Expo)
1. Run `npx expo prebuild` if native modules are required.
2. Use EAS Build: `eas build -p android --profile production` and `eas build -p ios --profile production`.
3. Submit to stores using `eas submit`.

---

## 6. Environment Variables (`.env.example`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/unexa?retryWrites=true&w=majority

# Auth
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d

# Cloud Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=unexa-media
AWS_REGION=us-east-1

# Redis (Caching Strategy Optional)
REDIS_URL=redis://127.0.0.1:6379
```
