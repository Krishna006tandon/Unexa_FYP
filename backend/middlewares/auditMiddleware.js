const AuditLog = require('../models/AuditLog');

const logAudit = async (req, action, details = {}, status = 'success') => {
  try {
    await AuditLog.create({
      user: req.user ? req.user._id : null,
      action,
      details,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      resource: req.originalUrl,
      status
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = { logAudit };
