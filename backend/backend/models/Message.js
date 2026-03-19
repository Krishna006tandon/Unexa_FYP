const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    content: { type: String, trim: true },
    messageType: { 
      type: String, 
      enum: ['text', 'image', 'video', 'audio', 'file'], 
      default: 'text' 
    },
    mediaUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    voiceDuration: { type: Number, default: null }, // in seconds
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
      }
    ],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes optimized for advanced queries
messageSchema.index({ chat: 1, createdAt: 1 });
messageSchema.index({ sender: 1, chat: 1 }); // For fetching messages sent by a user in a particular chat

module.exports = mongoose.model('Message', messageSchema);
