const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  resource: { type: String },
  status: { type: String, enum: ['success', 'failure'], default: 'success' }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
