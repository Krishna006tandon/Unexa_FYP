const mongoose = require('mongoose');

const mediaShareSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    mediaUrl: { type: String, required: true },
    mediaType: { 
      type: String, 
      enum: ['image', 'video'], 
      required: true 
    },
    caption: { type: String, trim: true, maxlength: 500 },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    thumbnail: { type: String }, // For videos
    duration: { type: Number }, // For videos in seconds
    views: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now }
    }],
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
      }
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, required: true, maxlength: 300 },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for efficient queries
mediaShareSchema.index({ sender: 1, createdAt: -1 });
mediaShareSchema.index({ recipients: 1, createdAt: -1 });
mediaShareSchema.index({ 'views.user': 1 });

module.exports = mongoose.model('MediaShare', mediaShareSchema);
