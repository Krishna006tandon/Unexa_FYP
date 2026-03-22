const Story = require('../models/Story');
const User = require('../models/User');

// Upload a new story
exports.uploadStory = async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption, duration } = req.body;
    const userId = req.user._id;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: 'Media URL and type are required' });
    }

    const story = await Story.create({
      user: userId,
      mediaUrl,
      mediaType,
      caption,
      duration
    });

    const populatedStory = await Story.findById(story._id)
      .populate('user', 'username profilePhoto');

    res.status(201).json(populatedStory);
  } catch (error) {
    console.error('Upload story error:', error);
    res.status(500).json({ error: 'Failed to upload story' });
  }
};

// Get all active stories from users that the current user follows
exports.getStories = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get users that current user follows
    const currentUser = await User.findById(userId).select('following');
    const followingIds = currentUser.following;
    followingIds.push(userId); // Include own stories

    // Get active stories from followed users
    const stories = await Story.find({
      user: { $in: followingIds },
      isDeleted: false,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username profilePhoto')
    .sort({ createdAt: -1 });

    // Group stories by user
    const storiesByUser = {};
    stories.forEach(story => {
      const storyUserId = story.user._id.toString();
      if (!storiesByUser[storyUserId]) {
        storiesByUser[storyUserId] = {
          user: story.user,
          stories: [],
          hasUnviewed: false
        };
      }
      storiesByUser[storyUserId].stories.push(story);
      
      // Check if current user has viewed this story
      const hasViewed = story.views.some(view => 
        view.user.toString() === userId.toString()
      );
      if (!hasViewed) {
        storiesByUser[storyUserId].hasUnviewed = true;
      }
    });

    res.json(Object.values(storiesByUser));
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// View a story (mark as viewed)
exports.viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if already viewed
    const alreadyViewed = story.views.some(view => 
      view.user.toString() === userId
    );

    if (!alreadyViewed) {
      story.views.push({ user: userId });
      await story.save();
    }

    res.json({ success: true, viewed: !alreadyViewed });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ error: 'Failed to view story' });
  }
};

// Delete a story
exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    story.isDeleted = true;
    await story.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
};

// Get user's own stories
exports.getMyStories = async (req, res) => {
  try {
    const userId = req.user._id;

    const stories = await Story.find({
      user: userId,
      isDeleted: false,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username profilePhoto')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    console.error('Get my stories error:', error);
    res.status(500).json({ error: 'Failed to fetch your stories' });
  }
};

// React to a story
exports.reactToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Remove existing reaction from this user (if any)
    story.reactions = story.reactions.filter(
      reaction => reaction.user.toString() !== userId
    );

    // Add new reaction
    story.reactions.push({ user: userId, emoji });
    await story.save();

    // Populate user info for reaction
    await story.populate('reactions.user', 'username profilePhoto');

    res.json({ success: true, reactions: story.reactions });
  } catch (error) {
    console.error('React to story error:', error);
    res.status(500).json({ error: 'Failed to react to story' });
  }
};

// Reply to a story
exports.replyToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Add reply
    story.replies.push({ user: userId, content: content.trim() });
    await story.save();

    // Populate user info for reply
    await story.populate('replies.user', 'username profilePhoto');

    res.json({ success: true, replies: story.replies });
  } catch (error) {
    console.error('Reply to story error:', error);
    res.status(500).json({ error: 'Failed to reply to story' });
  }
};

// Get story reactions and replies
exports.getStoryInteractions = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId)
      .populate('reactions.user', 'username profilePhoto')
      .populate('replies.user', 'username profilePhoto');

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      reactions: story.reactions,
      replies: story.replies,
      viewCount: story.views.length
    });
  } catch (error) {
    console.error('Get story interactions error:', error);
    res.status(500).json({ error: 'Failed to fetch story interactions' });
  }
};
