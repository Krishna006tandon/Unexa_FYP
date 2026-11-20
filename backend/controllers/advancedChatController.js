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
    const Chat = require('../models/Chat');
    const { sendPushNotification } = require('../utils/notifier');

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

      // 📩 Background Push Notification for Forwarded Message
      Chat.findById(chatId).populate('users', 'pushToken username').then(chat => {
        if (chat && chat.users) {
          chat.users.forEach(usr => {
            const targetId = (usr._id || usr).toString();
            if (targetId === req.user._id.toString()) return;
            if (usr.pushToken) {
              const body = originalMsg.messageType === 'text' ? originalMsg.content : `Forwarded ${originalMsg.messageType || 'media'}`;
              const title = chat.isGroupChat ? (chat.chatName || 'Group Chat') : (req.user?.username || 'New Message');
              sendPushNotification(
                usr.pushToken,
                title,
                body,
                {
                  route: 'Chats',
                  params: {
                    screen: 'ChatScreen',
                    params: { chatId: chatId.toString(), name: req.user?.username || 'Chat', receiverId: req.user._id.toString() }
                  }
                },
                { channelId: 'messages', priority: 'high' }
              ).catch(e => console.log('Forward push error:', e?.message));
            }
          });
        }
      }).catch(e => console.log('Forward chat populate error:', e?.message));
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

    const isStarred = (message.isStarredBy || []).some(id => (id._id || id).toString() === req.user._id.toString());
    if (isStarred) {
      message.isStarredBy = message.isStarredBy.filter(id => (id._id || id).toString() !== req.user._id.toString());
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
