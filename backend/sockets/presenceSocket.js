const User = require('../models/User');

module.exports = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    socket.on('user_connected', async (userId) => {
      if (!userId) return;
      
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit('user_online_status', { userId, isOnline: true });
      }
      
      onlineUsers.get(userId).add(socket.id);
      socket.presenceUserId = userId; 
    });

    socket.on('disconnect', async () => {
      const userId = socket.presenceUserId;
      if (!userId || !onlineUsers.has(userId)) return;

      const userSockets = onlineUsers.get(userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        io.emit('user_online_status', { userId, isOnline: false, lastSeen });
      }
    });
  });
};
