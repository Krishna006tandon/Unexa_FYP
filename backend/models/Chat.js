const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const chatSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true, get: decrypt, set: encrypt },
    groupPhoto: { 
      type: String, 
      default: "https://via.placeholder.cc/150?text=Group",
      get: decrypt,
      set: encrypt
    },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admins: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

chatSchema.index({ users: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
