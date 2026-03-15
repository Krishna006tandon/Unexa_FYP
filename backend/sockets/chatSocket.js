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
      var chat = newMessageReceived.chat;
      if (!chat || !chat.users) return;

      chat.users.forEach((user) => {
        if (user._id == newMessageReceived.sender._id) return;
        
        // Emit specifically to the user's personal room/connection so they get a notification
        // Or to the chat room for active chat viewers
        socket.in(user._id).emit('message_received', newMessageReceived);
        
        // Also emit directly to the active chat room
        socket.in(chat._id).emit('message_received', newMessageReceived);
      });
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
