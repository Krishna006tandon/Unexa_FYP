const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const caption = (req.body?.caption || '').toString();
    const imageUrl = req.file?.secure_url || req.file?.path || null;

    if (!caption.trim() && !imageUrl) {
      return res.status(400).json({ success: false, error: 'caption or image is required' });
    }

    const post = await Post.create({
      userId: req.user._id,
      caption: caption.trim(),
      imageUrl,
      likes: 0,
      likedBy: [],
      comments: [],
      isDeleted: false,
    });

    const populated = await Post.findById(post._id).populate('userId', 'username profilePhoto');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Post.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username profilePhoto'),
      Post.countDocuments({ isDeleted: false }),
    ]);

    res.json({
      success: true,
      data: { items, page, limit, total, hasMore: skip + items.length < total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).populate('userId', 'username profilePhoto');
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { postId } = req.body || {};
    if (!postId) return res.status(400).json({ success: false, error: 'postId is required' });

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const userId = req.user._id.toString();
    const hasLiked = (post.likedBy || []).some((id) => id.toString() === userId);

    if (hasLiked) {
      post.likedBy = post.likedBy.filter((id) => id.toString() !== userId);
      post.likes = Math.max(0, (post.likes || 0) - 1);
    } else {
      post.likedBy.push(req.user._id);
      post.likes = (post.likes || 0) + 1;
    }

    await post.save();
    res.json({ success: true, data: { postId: post._id, likes: post.likes, liked: !hasLiked } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.commentPost = async (req, res) => {
  try {
    const { postId, content } = req.body || {};
    if (!postId) return res.status(400).json({ success: false, error: 'postId is required' });
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    post.comments.push({ userId: req.user._id, content: content.toString() });
    await post.save();
    const populated = await Post.findById(post._id).populate('userId', 'username profilePhoto').populate('comments.userId', 'username profilePhoto');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const caption = (req.body?.caption || '').toString();
    const imageUrl = req.file?.secure_url || req.file?.path || null;

    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }

    if (caption != null) post.caption = caption.trim();
    if (imageUrl) post.imageUrl = imageUrl;

    if (!post.caption.trim() && !post.imageUrl) {
      return res.status(400).json({ success: false, error: 'caption or image is required' });
    }

    await post.save();
    const populated = await Post.findById(post._id).populate('userId', 'username profilePhoto').populate('comments.userId', 'username profilePhoto');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not allowed' });
    }
    post.isDeleted = true;
    await post.save();
    res.json({ success: true, data: { id: post._id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
