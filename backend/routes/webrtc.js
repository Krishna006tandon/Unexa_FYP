const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Store active calls and peer connections
const activeCalls = new Map();
const peerConnections = new Map();

// Socket.IO event handlers (to be called from server.js)
const setupWebRTCSignaling = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 WebRTC client connected:', socket.id);

    // Join call room
    socket.on('join-call', (data) => {
      const { chatId, userId } = data;
      const room = `call-${chatId}`;
      
      socket.join(room);
      
      // Store user in call
      if (!activeCalls.has(chatId)) {
        activeCalls.set(chatId, new Set());
      }
      activeCalls.get(chatId).add(userId);
      peerConnections.set(socket.id, { userId, chatId });
      
      console.log(`📞 User ${userId} joined call room ${room}`);
      
      // Notify others in the room
      socket.to(room).emit('user-joined-call', { userId });
    });

    // WebRTC Signaling Events
    socket.on('offer', (data) => {
      const { offer, chatId, userId } = data;
      const room = `call-${chatId}`;
      
      console.log(`📤 Offer from ${userId} in room ${room}`);
      socket.to(room).emit('offer', { offer, userId });
    });

    socket.on('answer', (data) => {
      const { answer, chatId, userId } = data;
      const room = `call-${chatId}`;
      
      console.log(`📤 Answer from ${userId} in room ${room}`);
      socket.to(room).emit('answer', { answer, userId });
    });

    socket.on('ice-candidate', (data) => {
      const { candidate, chatId, userId } = data;
      const room = `call-${chatId}`;
      
      console.log(`🧊 ICE candidate from ${userId} in room ${room}`);
      socket.to(room).emit('ice-candidate', { candidate, userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const connection = peerConnections.get(socket.id);
      if (connection) {
        const { userId, chatId } = connection;
        const room = `call-${chatId}`;
        
        // Remove from active calls
        if (activeCalls.has(chatId)) {
          activeCalls.get(chatId).delete(userId);
          if (activeCalls.get(chatId).size === 0) {
            activeCalls.delete(chatId);
          }
        }
        
        peerConnections.delete(socket.id);
        
        // Notify others
        socket.to(room).emit('user-left-call', { userId });
        
        console.log(`📞 User ${userId} left call room ${room}`);
      }
    });
  });
};

// Get active call status
router.get('/status/:chatId', protect, (req, res) => {
  const { chatId } = req.params;
  const participants = activeCalls.get(chatId);
  
  res.json({
    success: true,
    data: {
      isActive: participants && participants.size > 0,
      participantCount: participants ? participants.size : 0,
      participants: participants ? Array.from(participants) : []
    }
  });
});

module.exports = router;
module.exports.setupWebRTCSignaling = setupWebRTCSignaling;
