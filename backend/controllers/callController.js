const Call = require('../models/Call');

// @desc    Update call log (start/end)
// @route   POST /api/webrtc/call-log
const logCall = async (req, res) => {
  const { caller, receivers, chatId, type, action, callId, status } = req.body;
  try {
    if (action === 'start') {
      const call = await Call.create({ caller, receivers, chatId, type });
      return res.status(201).json(call);
    } 
    if (action === 'update' && callId) {
      const call = await Call.findByIdAndUpdate(callId, { status, endedAt: Date.now() }, { new: true });
      return res.json(call);
    }
    res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// @desc    Get call logs for user
// @route   GET /api/webrtc/calls
const getCalls = async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user._id },
        { receivers: { $elemMatch: { $eq: req.user._id } } }
      ]
    })
    .populate('caller', 'username profilePhoto')
    .populate('receivers', 'username profilePhoto')
    .sort({ startedAt: -1 })
    .limit(50);
    res.json(calls);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { logCall, getCalls };
