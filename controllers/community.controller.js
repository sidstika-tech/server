const Post = require('../models/communityPost.model');

/* ── SEED DATA — realistic MENA founder community posts ── */
const SEED_POSTS = [
  { authorName: 'Mohammed Al-Rashid', type: 'success', text: '🎉 Just closed my first 10 paying clients for my consulting firm in Riyadh! Started 6 weeks ago with nothing but the Business DNA analysis. The psychological path it recommended was spot on — I am a Connector, and the people-first approach made all the difference. Do not sleep on this platform.', likes: [], replies: [{ authorName: 'Sara K.', text: 'This is so inspiring! What industry are you in?', createdAt: new Date(Date.now() - 3600000 * 2) }, { authorName: 'Ahmed M.', text: 'Mashallah! Can you share more about the first client?', createdAt: new Date(Date.now() - 3600000 * 1) }], createdAt: new Date(Date.now() - 3600000 * 5) },
  { authorName: 'Layla Hassan', type: 'question', text: 'Question for the community — I am launching a modest fashion e-commerce brand in Dubai. Should I start with Instagram only or also run Google ads from day one? Budget is AED 3,000/month for marketing. What worked for you?', likes: [], replies: [{ authorName: 'Youssef T.', text: 'Start Instagram only. Google ads need more budget and data. Build organic first.', createdAt: new Date(Date.now() - 3600000 * 8) }, { authorName: 'Nada R.', text: 'Agree with Youssef. Also TikTok is crushing it for fashion in UAE right now.', createdAt: new Date(Date.now() - 3600000 * 6) }], createdAt: new Date(Date.now() - 3600000 * 12) },
  { authorName: 'Yassine Berrada', type: 'review', text: 'The Business DNA tool is scary accurate. It told me exactly why I was struggling with my previous project — I am a Builder trying to run a sales-heavy business. That mismatch was killing me. Switched to a product-based model and everything changed. Highly recommend everyone complete their DNA before doing anything else.', likes: [], replies: [], createdAt: new Date(Date.now() - 3600000 * 18) },
  { authorName: 'Fatima Al-Zahrawi', type: 'comment', text: 'Networking becomes so much easier when you have a clear brand kit. Just shared mine with a potential partner and they were impressed by the professionalism. The Launch Package paid for itself in the first meeting.', likes: [], replies: [{ authorName: 'Omar B.', text: 'Which section was most useful for you?', createdAt: new Date(Date.now() - 3600000 * 20) }], createdAt: new Date(Date.now() - 3600000 * 24) },
  { authorName: 'Khalid Al-Mutairi', type: 'success', text: 'Week 3 update: Followed the 30-day failure-proof map from my DNA results. Week 1 — talked to 22 potential customers. Week 2 — ran a small ask test with a WhatsApp group. Week 3 — got my first paid order of KWD 180. Nothing crazy but this is real validation. The map works if you follow it exactly.', likes: [], replies: [{ authorName: 'Hana S.', text: 'Love this! Keep posting updates please!', createdAt: new Date(Date.now() - 3600000 * 26) }], createdAt: new Date(Date.now() - 3600000 * 28) },
  { authorName: 'Amira Nour', type: 'question', text: 'For anyone who has used the Competitor Tracker — how often do you run manual analysis? I have 4 competitors tracked and wondering if weekly is enough or I should analyze after every major market event.', likes: [], replies: [{ authorName: 'Ziad K.', text: 'Weekly is perfect for most businesses. Only run manual if something big happens — competitor launches new product, drops prices, etc.', createdAt: new Date(Date.now() - 3600000 * 30) }], createdAt: new Date(Date.now() - 3600000 * 36) },
  { authorName: 'Ibrahim Saad', type: 'comment', text: 'Hot take: most founders in MENA fail not because of bad ideas but because they never actually talk to customers. The Detective Phase in week 1 of the 30-day map was uncomfortable but necessary. I had 3 assumptions completely wrong.', likes: [], replies: [], createdAt: new Date(Date.now() - 3600000 * 48) },
  { authorName: 'Nour Al-Din', type: 'success', text: 'Used the SEO keyword tool for my Cairo-based legal services firm. Found Arabic search terms with basically zero competition that I had no idea existed. Implemented them in week 1, saw traffic increase 40% by week 3. Arabic SEO is genuinely underused.', likes: [], replies: [{ authorName: 'Amira N.', text: 'Can you share the strategy? I need this for my business too!', createdAt: new Date(Date.now() - 3600000 * 50) }], createdAt: new Date(Date.now() - 3600000 * 52) },
];

/* Auto-seed — runs silently on first load when collection is empty */
let _seeded = false;
async function maybeAutoSeed() {
  if (_seeded) return;
  _seeded = true;
  try {
    const count = await Post.countDocuments();
    if (count === 0) {
      await Post.insertMany(SEED_POSTS.map(p => ({
        ...p,
        user: '000000000000000000000001', // placeholder ObjectId for seeded posts
        pinned: false,
      })));
      console.log('✅ Community seeded with starter posts');
    }
  } catch (e) { console.warn('Community seed warning:', e.message); }
}

exports.getPosts = async (req, res) => {
  try {
    await maybeAutoSeed();
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
    console.error('getPosts error:', err);
    res.status(500).json({ error: 'Failed to load posts.' });
  }
};

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
    console.error('createPost error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your post' });
    }
    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
};

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
    console.error('toggleLike error:', err);
    res.status(500).json({ error: 'Failed to update like.' });
  }
};

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
    console.error('addReply error:', err);
    res.status(500).json({ error: 'Failed to add reply.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Post.countDocuments();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = await Post.countDocuments({ createdAt: { $gte: today } });
    const members = await Post.distinct('user');
    res.json({ success: true, total, todayCount, members: members.length });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
};
