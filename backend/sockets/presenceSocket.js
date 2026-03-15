const User = require('../models/User');

module.exports = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    socket.on('user_connected', async (userId) => {
      // Store socket ID mapping
      onlineUsers.set(userId, socket.id);
      
      // Update DB
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Broadcast globally or to specific friends/chats
      socket.broadcast.emit('user_online_status', { userId, isOnline: true });
    });

    socket.on('disconnect', async () => {
      let disconnectedUserId = null;
      for (let [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        await User.findByIdAndUpdate(disconnectedUserId, { 
           isOnline: false, 
           lastSeen: Date.now() 
        });
        socket.broadcast.emit('user_online_status', { 
           userId: disconnectedUserId, 
           isOnline: false, 
           lastSeen: Date.now() 
        });
      }
    });
  });
};
