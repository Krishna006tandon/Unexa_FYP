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
    origin: '*', // For development. Update in production.
    methods: ['GET', 'POST']
  }
});

// Import Socket Logic
require('./sockets/presenceSocket')(io);
require('./sockets/chatSocket')(io);
require('./sockets/profileSocket')(io);

// Middlewares
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Expose uploads folder
app.use(helmet());

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

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('UNEXA SuperApp API is running...');
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
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageLimiter, messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/story', storyRoutes);
app.use('/api/media', mediaShareRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/profile', profileRoutes);

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
