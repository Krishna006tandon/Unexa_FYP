const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caption: { type: String, trim: true, maxlength: 2000, default: '' },
    imageUrl: { type: String, default: null },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, trim: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Post', postSchema);
