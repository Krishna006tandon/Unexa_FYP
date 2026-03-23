const mongoose = require('mongoose');

const profileInsightSchema = new mongoose.Schema(
  {
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // optional (e.g., anonymous views)
    viewDate: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProfileInsight', profileInsightSchema);
