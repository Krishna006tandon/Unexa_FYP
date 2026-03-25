const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    groupPhoto: { type: String, default: "https://via.placeholder.com/150?text=Group" },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admins: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

chatSchema.index({ users: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
