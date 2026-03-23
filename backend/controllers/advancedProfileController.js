const User = require('../models/User');
const ProfileInsight = require('../models/ProfileInsight');
const Highlight = require('../models/Highlight');
const Story = require('../models/Story');

// Log Profile View
exports.recordProfileView = async (req, res) => {
  const { userId } = req.params;
  const viewerId = req.user._id;

  if (userId.toString() === viewerId.toString()) return res.status(204).end();

  try {
    await ProfileInsight.create({ targetUser: userId, viewer: viewerId });
    res.status(201).end();
  } catch (error) {
    res.status(500).end();
  }
};

// Get Profile Insights (Views by Day)
exports.getProfileInsights = async (req, res) => {
  const userId = req.user._id;
  const days = req.query.days || 7;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const insights = await ProfileInsight.aggregate([
      { $match: { targetUser: userId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          views: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
};

// Create a Highlight
exports.createHighlight = async (req, res) => {
  const { title, stories, coverImage } = req.body;
  if (!title || !stories || !stories.length) return res.status(400).json({ error: 'Title and stories are required' });

  try {
    const highlight = await Highlight.create({ user: req.user._id, title, stories, coverImage });
    res.status(201).json(highlight);
  } catch (error) {
    res.status(500).json({ error: 'Highlight creation failed' });
  }
};

// Get User's Highlights
exports.getUserHighlights = async (req, res) => {
  const { userId } = req.params;
  try {
    const highlights = await Highlight.find({ user: userId, isDeleted: false }).populate('stories');
    res.json(highlights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
};

// Get Mutual Friends
exports.getMutualFriends = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  try {
    const targetUser = await User.findById(userId).select('followers following');
    const currentUser = await User.findById(currentUserId).select('followers following');

    if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found' });

    // Mutual friends = intersection of your followings and target user's followings
    const targetFollowingArr = targetUser.following.map(id => id.toString());
    const mutuals = currentUser.following.filter(id => targetFollowingArr.includes(id.toString()));

    // Get basic user info for mutuals
    const mutualUsers = await User.find({ _id: { $in: mutuals } }).select('username profilePhoto');
    res.json(mutualUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mutual friends' });
  }
};

// Add to Close Friends
exports.toggleCloseFriend = async (req, res) => {
  const { friendId } = req.body;
  try {
    const user = await User.findById(req.user._id);
    const isAlreadyCloseFriend = user.closeFriends.includes(friendId);
    if (isAlreadyCloseFriend) {
      user.closeFriends.pull(friendId);
    } else {
      user.closeFriends.push(friendId);
    }
    await user.save();
    res.json({ success: true, closeFriend: !isAlreadyCloseFriend });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Close Friends' });
  }
};
