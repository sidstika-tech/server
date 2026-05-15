const Post = require('../models/communityPost.model');

// GET all posts (paginated)
exports.getPosts = async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const filter = type && type !== 'all' ? { type } : {};
    const posts = await Post.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();
    const total = await Post.countDocuments(filter);
    res.json({ success: true, posts, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create post
exports.createPost = async (req, res) => {
  try {
    const { type, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });
    const post = await Post.create({
      user: req.user._id,
      authorName: req.user.name || 'Anonymous',
      type: type || 'comment',
      text: text.trim().slice(0, 1000),
    });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE own post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.user.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your post' });
    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST toggle like
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    const uid = req.user._id.toString();
    const idx = post.likes.findIndex(l => l.toString() === uid);
    if (idx === -1) post.likes.push(req.user._id);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ success: true, likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add reply
exports.addReply = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    post.replies.push({
      user: req.user._id,
      authorName: req.user.name || 'Anonymous',
      text: text.trim().slice(0, 500),
    });
    await post.save();
    res.json({ success: true, reply: post.replies[post.replies.length - 1] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET stats
exports.getStats = async (req, res) => {
  try {
    const total = await Post.countDocuments();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = await Post.countDocuments({ createdAt: { $gte: today } });
    const members = await Post.distinct('user');
    res.json({ success: true, total, todayCount, members: members.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
