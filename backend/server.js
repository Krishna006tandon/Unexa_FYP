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
const server = http.createServer(app);

// Socket.IO Setup
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
});
app.use(limiter);

// Specific rate limit for messages
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: "Too many messages sent from this IP, please try again after a minute"
});

// Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const storyRoutes = require('./routes/storyRoutes');

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

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 UNEXA Backend Server running on port ${PORT}`);
});
