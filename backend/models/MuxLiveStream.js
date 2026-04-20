const mongoose = require('mongoose');

const muxLiveStreamSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Mux identifiers
    muxLiveStreamId: { type: String, required: true, unique: true, index: true },
    streamKey: { type: String, required: true, unique: true, index: true }, // treat like a password
    playbackId: { type: String, required: true, index: true },

    // App state
    title: { type: String, trim: true, maxlength: 120, default: 'Live Stream' },
    status: { type: String, enum: ['idle', 'live', 'ended'], default: 'idle', index: true },

    // Optional metadata
    lastWebhookAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

muxLiveStreamSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MuxLiveStream', muxLiveStreamSchema);

