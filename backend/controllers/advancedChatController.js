const Message = require('../models/Message');

// Forward message to multiple chats
exports.forwardMessage = async (req, res) => {
  const { messageId, chatIds } = req.body;
  if (!messageId || !chatIds || !chatIds.length) {
    return res.status(400).json({ error: 'Message ID and Target Chat IDs are required' });
  }

  try {
    const originalMsg = await Message.findById(messageId);
    if (!originalMsg) return res.status(404).json({ error: 'Message not found' });

    const forwardedMessages = [];
    for (const chatId of chatIds) {
      const newMsg = await Message.create({
        sender: req.user._id,
        chat: chatId,
        content: originalMsg.content,
        messageType: originalMsg.messageType,
        mediaUrl: originalMsg.mediaUrl,
        isForwarded: true
      });
      forwardedMessages.push(newMsg);
    }

    res.status(201).json(forwardedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Forwarding failed' });
  }
};

// Toggle Star for a message
exports.toggleStarMessage = async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isStarred = message.isStarredBy.includes(req.user._id);
    if (isStarred) {
      message.isStarredBy.pull(req.user._id);
    } else {
      message.isStarredBy.push(req.user._id);
    }
    await message.save();
    res.json({ success: true, starred: !isStarred });
  } catch (error) {
    res.status(500).json({ error: 'Starring failed' });
  }
};

// Set Vanish Mode expiry for a message
exports.setVanishMessage = async (req, res) => {
  const { messageId, expiresAt } = req.body;
  try {
    await Message.findByIdAndUpdate(messageId, { expiresAt: new Date(expiresAt) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set expiry' });
  }
};
