const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: { type: String, enum: ['missed', 'completed', 'cancelled', 'ongoing'], default: 'ongoing' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 } // in seconds
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema);
