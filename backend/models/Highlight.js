const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    coverImage: { type: String, default: null }, // URL to cover photo
    stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Highlight', highlightSchema);
