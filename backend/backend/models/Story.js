const mongoose = require('mongoose');

const storyViewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

const storyReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const storyReplySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { 
      type: String, 
      enum: ['image', 'video'], 
      required: true 
    },
    caption: { type: String, trim: true, maxlength: 200 },
    duration: { type: Number, default: 5 }, // in seconds, for video stories
    views: [storyViewSchema],
    reactions: [storyReactionSchema],
    replies: [storyReplySchema],
    expiresAt: { 
      type: Date, 
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expires: 0 } // Auto-delete after expiration
    },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for efficient queries
storySchema.index({ user: 1, expiresAt: 1 });
storySchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Story', storySchema);
