const Message = require('../models/Message');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // We assume presence is handled in presenceSocket.js
    // This file specifically focuses on Chat isolated rooms.

    socket.on('join_chat', (room) => {
      socket.join(room);
    });

    socket.on('leave_chat', (room) => {
      socket.leave(room);
    });

    socket.on('typing', (room) => {
      socket.in(room).emit('typing');
    });

    socket.on('stop_typing', (room) => {
      socket.in(room).emit('stop_typing');
    });

    // Send generic new message
    socket.on('new_message', (newMessageReceived) => {
      const chat = newMessageReceived.chat;
      if (!chat) return;

      console.log(`✉️ [SOCKET] New message from ${newMessageReceived.sender.username} in room ${chat._id || chat}`);
      
      // Broadcast to the whole chat room
      const roomId = chat._id || chat;
      socket.in(roomId).emit('message_received', newMessageReceived);

      // Also ensure delivery to individual user rooms if they aren't active in the chat room
      if (chat.users) {
        chat.users.forEach((user) => {
          const targetUserId = user._id || user;
          if (targetUserId.toString() === newMessageReceived.sender._id.toString()) return;
          
          socket.in(targetUserId.toString()).emit('message_received', newMessageReceived);
        });
      }

      // Handle Vanish Mode (Auto-delete)
      if (newMessageReceived.expiresAt) {
        const delay = new Date(newMessageReceived.expiresAt).getTime() - Date.now();
        if (delay > 0) {
          setTimeout(async () => {
            try {
              await Message.findByIdAndUpdate(newMessageReceived._id, { deleted: true, content: "Message vanished" });
              io.in(chat._id).emit('message_deleted_update', { messageId: newMessageReceived._id });
            } catch (e) { console.log("Vanish delete failed", e); }
          }, delay);
        }
      }
    });

    // Advance features - Delivered to Event
    socket.on('measure_delivered', async ({ messageId, userId, chatId }) => {
       await Message.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: userId } });
       socket.in(chatId).emit('message_delivered', { messageId, userId });
    });

    // Advance features - Read Receipts
    socket.on('measure_read', async ({ messageId, userId, chatId }) => {
       await Message.findByIdAndUpdate(messageId, { $addToSet: { seenBy: userId } });
       socket.in(chatId).emit('message_read', { messageId, userId });
    });

    // Edit message live broadcast
    socket.on('message_edited', ({ messageId, content, chatId }) => {
       socket.in(chatId).emit('message_edited_update', { messageId, content });
    });

    // Delete message live broadcast
    socket.on('message_deleted', ({ messageId, chatId }) => {
       socket.in(chatId).emit('message_deleted_update', { messageId });
    });
  });
};
