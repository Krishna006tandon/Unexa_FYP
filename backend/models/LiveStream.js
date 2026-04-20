const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 120, default: 'Live Stream' },
    streamKey: { type: String, required: true, unique: true, index: true },
    isLive: { type: Boolean, default: false, index: true },
    viewerCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveStream', liveStreamSchema);

