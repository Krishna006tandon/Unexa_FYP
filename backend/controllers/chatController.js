const Chat = require('../models/Chat');
const User = require('../models/User'); // Assuming User model exists

// Access 1-on-1 chat or create one if it doesn't exist (POST) or get existing chat (GET)
exports.accessChat = async (req, res) => {
  const { userId } = req.body; // For POST request
  const { chatId } = req.params; // For GET request

  // Handle GET request - fetch existing chat
  if (chatId && !userId) {
    try {
      let chat = await Chat.findById(chatId)
        .populate('users', '-passwordHash')
        .populate('latestMessage');

      chat = await User.populate(chat, {
        path: 'latestMessage.sender',
        select: 'username profilePhoto email',
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.send(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // Handle POST request - create or access chat
  if (!userId) {
    return res.status(400).json({ error: 'UserId param not sent with request' });
  }

  try {
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } }, // req.user._id from protect middleware
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-passwordHash')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'username profilePhoto email',
    });

    const Profile = require('../models/Profile');
    const enrichedChat = await Promise.all(isChat.map(async (chat) => {
      const chatObj = chat.toObject();
      chatObj.users = await Promise.all(chatObj.users.map(async (u) => {
         const userProfile = await Profile.findOne({ user: u._id }).select('avatar');
         if (userProfile && userProfile.avatar) {
            u.avatar = userProfile.avatar;
            u.profilePhoto = userProfile.avatar;
         }
         return u;
      }));
      return chatObj;
    }));

    if (enrichedChat.length > 0) {
      res.send(enrichedChat[0]);
    } else {
      let chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-passwordHash'
      );
      res.status(200).json(fullChat);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch all chats for a logged in user
exports.fetchChats = async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', 'username profilePhoto email') // Get basic user info
      .populate('groupAdmin', 'username profilePhoto email')
      .populate('latestMessage')
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: 'latestMessage.sender',
          select: 'username profilePhoto email',
        });

        // DEEP SYNC: Ensure real profile pictures (avatars) are used
        const mongoose = require('mongoose');
        const Profile = mongoose.model('Profile');
        console.log(`[BACKEND-CHAT] ⚙️ Starting Deep Sync for ${results.length} chats...`);
        
        const enrichedResults = await Promise.all(results.map(async (chat) => {
          const chatObj = chat.toObject();
          chatObj.users = await Promise.all(chatObj.users.map(async (u) => {
             try {
                const userProfile = await Profile.findOne({ user: u._id });
                if (userProfile && userProfile.avatar) {
                   console.log(`   ✅ SUCCESS: Found Avatar for ${u.username} (${u._id}): ${userProfile.avatar}`);
                   u.avatar = userProfile.avatar;
                   u.profilePhoto = userProfile.avatar;
                } else {
                   console.log(`   ⚠️ WARNING: No Avatar in Profile for ${u.username} (${u._id})`);
                }
             } catch (err) {
                console.log(`   ❌ ERROR syncing profile for ${u.username}:`, err.message);
             }
             return u;
          }));
          return chatObj;
        }));

        res.status(200).send(enrichedResults);
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create New Group Chat
exports.createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: 'Please Fill all the fields' });
  }

  let users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res.status(400).send('More than 2 users are required to form a group chat');
  }

  users.push(req.user._id);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-passwordHash')
      .populate('groupAdmin', '-passwordHash');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rename Group Chat
exports.renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName: chatName },
      { new: true }
    )
      .populate('users', '-passwordHash')
      .populate('groupAdmin', '-passwordHash');

    if (!updatedChat) {
      res.status(404).send('Chat Not Found');
    } else {
      res.json(updatedChat);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add user to Group Chat
exports.addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-passwordHash')
      .populate('groupAdmin', '-passwordHash');

    if (!added) {
      res.status(404).json({ message: 'Chat Not Found' });
    } else {
      res.json(added);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove user from Group Chat
exports.removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-passwordHash')
      .populate('groupAdmin', '-passwordHash');

    if (!removed) {
      res.status(404).json({ message: 'Chat Not Found' });
    } else {
      res.json(removed);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch user's friends (chat partners)
exports.fetchFriends = async (req, res) => {
  try {
    console.log('Fetching friends for user:', req.user._id);
    
    const chats = await Chat.find({ 
      users: { $elemMatch: { $eq: req.user._id } } 
    })
    .populate('users', '-passwordHash')
    .select('users');

    console.log('Found chats:', chats.length);

    // Extract unique friends from all chats
    const friendsSet = new Set();
    chats.forEach(chat => {
      chat.users.forEach(user => {
        if (user._id.toString() !== req.user._id.toString()) {
          friendsSet.add(user._id.toString());
        }
      });
    });

    console.log('Unique friends IDs:', Array.from(friendsSet));

    // Convert Set back to array and populate full user details
    const friendsIds = Array.from(friendsSet);
    const friends = await User.find({ 
      _id: { $in: friendsIds } 
    }).select('username email profilePhoto');

    console.log('Friends found:', friends.length);

    res.json({ friends });
  } catch (error) {
    console.error('Error in fetchFriends:', error);
    res.status(500).json({ error: error.message });
  }
};
