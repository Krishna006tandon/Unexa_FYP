const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { logCall, getCalls } = require('../controllers/callController');
const CallLog = require('../models/Call');

// Store active calls and peer connections
const activeCalls = new Map();
const peerConnections = new Map();

// Socket.IO event handlers (to be called from server.js)
const setupWebRTCSignaling = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 WebRTC client connected:', socket.id);

    socket.on('setup', (userData) => {
      const id = userData?._id || userData?.id;
      if (!id) return;
      socket.join(id.toString());
      socket.join(`profile_${id.toString()}`);
      socket.userId = id.toString();
      console.log('User joined profile room:', socket.userId);
    });

    // WEBRTC CALL SIGNALING (Incoming vs Calling)
    socket.on('call-invite', (data) => {
      console.log(`[BACKEND] 📡 Received call-invite:`, data);
      const { callerId, receiverId, callerName, callerAvatar, chatId, type } = data;
      console.log(`🔔 Sending Call Invite from ${callerName} to User ${receiverId}`);
      
      // Send to the specific profile room
      socket.to(`profile_${receiverId.toString()}`).emit('call-invite', {
        callerId,
        callerName,
        callerAvatar,
        chatId,
        type
      });

      // LOG START OF CALL
      CallLog.create({ 
        caller: callerId, 
        receivers: Array.isArray(receiverId) ? receiverId : [receiverId], 
        chatId, 
        type, 
        status: 'ongoing' 
      }).then(call => {
        socket.lastCallId = call._id;
      }).catch(e => console.log("Call log failed", e));
    });

    socket.on('call-decline', (data) => {
      console.log(`[BACKEND] 🚫 Received call-decline:`, data);
      const { callerId, chatId } = data;
      console.log(`🚫 Call Declined for Chat ${chatId}`);
      // Update log to missed/cancelled
      CallLog.findOneAndUpdate({ chatId, status: 'ongoing' }, { status: 'missed', endedAt: Date.now() }).catch(e => {});
      socket.to(`profile_${callerId.toString()}`).emit('call-cancelled', { chatId });
    });

    socket.on('cancel-call', (data) => {
      console.log(`[BACKEND] 🚫 Received cancel-call:`, data);
      const { receiverId, chatId } = data;
      console.log(`🚫 Call Cancelled by caller for Chat ${chatId}`);
      socket.to(`profile_${receiverId.toString()}`).emit('call-cancelled', { chatId });
    });

    socket.on('call-ended', (data) => {
      const { receiverId, chatId } = data;
      console.log(`🔚 [WEBRTC] Call ended for chat ${chatId} by user ${socket.userId || socket.id}`);
      if (receiverId) {
        socket.to(`profile_${receiverId.toString()}`).emit('call-ended', { chatId });
      }
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

const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// Agora Token Generation Endpoint
router.post('/token', protect, (req, res) => {
  const { channelName, uid } = req.body;
  
  if (!channelName) {
    return res.status(400).json({ success: false, message: 'Channel name is required' });
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_PRIMARY_CERTIFICATE;
  
  if (!appId || !appCertificate) {
    return res.status(500).json({ success: false, message: 'Agora credentials missing on server' });
  }

  // Token duration (1 hour)
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    res.json({
      success: true,
      token,
      appId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate token' });
  }
});

// Call Log Endpoints
router.route('/calls').get(protect, getCalls);
router.route('/log').post(protect, logCall);

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
