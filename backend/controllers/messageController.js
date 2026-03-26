const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Send Message (Advanced Text/Media/Audio)
exports.sendMessage = async (req, res) => {
  const { content, chatId, messageType, mediaUrl, fileName, fileSize, voiceDuration, replyTo } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'ChatId not provided' });
  }

  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'Content or mediaUrl must be provided' });
  }

  var newMessage = {
    sender: req.user._id,
    content: content || '',
    chat: chatId,
    messageType: messageType || 'text',
    mediaUrl: mediaUrl || null,
    fileName: fileName || null,
    fileSize: fileSize || null,
    voiceDuration: voiceDuration || null,
    replyTo: replyTo || null,
    deliveredTo: [], // will be populated via sockets
    seenBy: []       // will be populated via sockets
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate('sender', 'username profilePhoto');
    message = await message.populate('chat');
    
    if (replyTo) {
      message = await message.populate('replyTo', 'content messageType sender'); 
    }

    // Update Chat's latest message and touch timestamp
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Fetch Messages
exports.allMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username profilePhoto')
      .populate('replyTo', 'content messageType sender mediaUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // ⚡ AUTOMATICALLY MARK AS READ when fetching
    await Message.updateMany(
      { chat: req.params.chatId, seenBy: { $ne: req.user._id }, sender: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );

    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete Message (Soft delete)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    
    // Auth check
    if (message.sender.toString() !== req.user._id.toString()) {
       return res.status(403).json({ error: 'Not authorized to delete' });
    }

    message.deleted = true;
    message.content = "This message was deleted";
    message.mediaUrl = null;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Edit Message
exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.sender.toString() !== req.user._id.toString()) {
       return res.status(403).json({ error: 'Not authorized to edit' });
    }
    
    if (message.deleted) return res.status(400).json({ error: 'Cannot edit deleted message' });

    message.content = content;
    message.edited = true;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Toggle Message Reaction
exports.toggleReaction = async (req, res) => {
  const { messageId, emoji } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // One emoji per user per message (Toggle/Replace logic)
    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString()
    );

    if (existingReaction && existingReaction.emoji === emoji) {
      // If same emoji, REMOVE it (Toggle off)
      message.reactions = message.reactions.filter(
         r => r.user.toString() !== userId.toString()
      );
    } else {
      // If different emoji or no reaction, REPLACE/ADD (Update to new emoji)
      message.reactions = message.reactions.filter(
         r => r.user.toString() !== userId.toString()
      );
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    
    const updatedMessage = await Message.findById(messageId)
        .populate("sender", "username profilePhoto")
        .populate("reactions.user", "username profilePhoto");

    res.json(updatedMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Toggle Message Star
exports.toggleStar = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const isStarred = message.isStarredBy.includes(userId);
    if (isStarred) {
      message.isStarredBy = message.isStarredBy.filter(id => id.toString() !== userId.toString());
    } else {
      message.isStarredBy.push(userId);
    }

    await message.save();
    res.json({ success: true, isStarred: !isStarred });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Forward Message
exports.forwardMessages = async (req, res) => {
  const { messageId, chatIds } = req.body;
  
  try {
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) return res.status(404).json({ error: "Message not found" });

    const forwardedMessages = await Promise.all(chatIds.map(async (chatId) => {
       const newMessage = await Message.create({
          sender: req.user._id,
          chat: chatId,
          content: originalMessage.content,
          messageType: originalMessage.messageType,
          mediaUrl: originalMessage.mediaUrl,
          fileName: originalMessage.fileName,
          fileSize: originalMessage.fileSize,
          voiceDuration: originalMessage.voiceDuration,
          isForwarded: true
       });

       await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });
       return newMessage;
    }));

    res.json({ success: true, messages: forwardedMessages });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
