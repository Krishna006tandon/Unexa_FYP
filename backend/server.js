const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');

// Initialize App
const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', true);

// Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: (origin, callback) => {
      const allowed = ["https://unexa-fyp.onrender.com"];
      if (!origin || allowed.indexOf(origin) !== -1 || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('❌ [CORS-SOCKET] Origin not allowed'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

// Import Socket Logic
require('./sockets/presenceSocket')(io);
require('./sockets/chatSocket')(io);
require('./sockets/profileSocket')(io);
require('./routes/webrtc').setupWebRTCSignaling(io);

// Middlewares
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ["http://localhost:8081", "https://unexa-fyp.onrender.com"];
    if (!origin || allowed.indexOf(origin) !== -1 || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('❌ [CORS] Deployment error: Origin not allowed'));
    }
  },
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Expose uploads folder
app.use(helmet({
  contentSecurityPolicy: false, // Required for WebRTC/Agora script execution
}));

// Critical Infrastructure Verification
console.log('🚀 [DEPLOY-READY] Checking Infrastructure...');
console.log('   AGORA_APP_ID:', process.env.AGORA_APP_ID ? '✅ READY' : '❌ MISSING (Call system will fail)');
console.log('   AGORA_CERTIFICATE:', process.env.AGORA_PRIMARY_CERTIFICATE ? '✅ READY' : '⚠️ MISSING (Token generation will fail)');
console.log('   MONGO_URI:', process.env.MONGO_URI ? '✅ READY' : '⚠️ USING FALLBACK');
console.log('   ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✅ READY' : '❌ MISSING (Security features compromised)');

// Rate Limiting for overall API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/' || req.path === '/api/test';
  }
});

// Specific rate limit for authentication (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: "Too many login/auth attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

// Specific rate limit for messages
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: "Too many messages sent from this IP, please try again after a minute",
  validate: { trustProxy: false },
  // Skip rate limiting for development
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const storyRoutes = require('./routes/storyRoutes');
const mediaShareRoutes = require('./routes/mediaShare');
const streakRoutes = require('./routes/streaks');
const profileRoutes = require('./routes/profileRoutes');
const webrtcRoutes = require('./routes/webrtc');
const advancedRoutes = require('./routes/advancedRoutes');

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('UNEXA SuperApp API is running...');
});

// Profile Deep Link Redirection
app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening UNEXA...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #0A0A0A; color: white; text-align: center; }
          .container { padding: 20px; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #7B61FF; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Opening Profile in UNEXA...</h2>
          <p>If the app doesn't open automatically, click the button below:</p>
          <a href="unexa://profile/${id}" class="btn">Open UNEXA App</a>
        </div>
        <script>
          window.location.href = "unexa://profile/${id}";
          // Fallback after 3 seconds
          setTimeout(function() {
            console.log("App didn't open automatically");
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageLimiter, messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/story', storyRoutes);
app.use('/api/media', mediaShareRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/advanced', advancedRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test Cloudinary Configuration
const cloudinary = require('./config/cloudinary').cloudinary;
console.log('☁️ Cloudinary Configuration:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 UNEXA Backend Server running on port ${PORT}`);
});
