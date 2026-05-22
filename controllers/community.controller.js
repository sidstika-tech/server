const Post = require('../models/communityPost.model');
const mongoose = require('mongoose');

/* ══════════════════════════════════════════════════════════════════
   COMMUNITY — 10 seed posts that persist. User posts add normally.
   Seed posts use a fixed known user ID so they're never confused
   with real user posts. They stay forever unless manually deleted.
══════════════════════════════════════════════════════════════════ */

const SEED_USER_ID = new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');

const SEEDS = [
  { authorName: 'Mohammed Al-Rashid', type: 'success', text: '🎉 Just closed my first 10 paying clients for my consulting firm in Riyadh! The Business DNA analysis recommended a people-first approach because I am a Connector — and it was right. Every single client came from warm introductions, not cold outreach. 6 weeks from zero to consistent revenue.', replies: [
    { user: SEED_USER_ID, authorName: 'Sara K.', text: 'Mashallah! What industry are you consulting in?' },
    { user: SEED_USER_ID, authorName: 'Ahmed M.', text: 'Can you share how you structured your pricing for the first clients?' },
    { user: SEED_USER_ID, authorName: 'Noura B.', text: 'I am also a Connector type. This gives me hope. Starting next week!' },
    { user: SEED_USER_ID, authorName: 'Faisal Q.', text: 'The warm intro strategy is underrated. Most people waste money on ads first.' },
  ]},
  { authorName: 'Layla Hassan', type: 'question', text: 'Launching a modest fashion e-commerce brand in Dubai. Should I start Instagram only or also run Google Ads from day one? Budget is AED 3,000/month for marketing. I keep going back and forth — what actually worked for you?', replies: [
    { user: SEED_USER_ID, authorName: 'Youssef T.', text: 'Start Instagram only. Google Ads needs more budget and more data. Build organic + WhatsApp first.' },
    { user: SEED_USER_ID, authorName: 'Nada R.', text: 'Agree with Youssef. Also TikTok is crushing it for fashion in UAE right now — more reach than IG.' },
    { user: SEED_USER_ID, authorName: 'Khalid S.', text: 'I spent AED 5K on Google Ads before I had product-market fit. Wasted. Instagram stories + influencer swaps got me my first 50 sales.' },
    { user: SEED_USER_ID, authorName: 'Mona D.', text: 'For modest fashion specifically — Pinterest is also huge. Women save outfit ideas there. Free traffic.' },
  ]},
  { authorName: 'Yassine Berrada', type: 'review', text: 'The Business DNA told me I am a Builder trying to run a sales-heavy business. That mismatch was destroying my energy and results. Switched to a product-based model where I build once and sell repeatedly — everything changed. Revenue up, stress down, clients happier. If you feel stuck, maybe you are in the wrong model for your personality.', replies: [
    { user: SEED_USER_ID, authorName: 'Rania H.', text: 'This is exactly what I needed to hear today. I think I have the same mismatch.' },
    { user: SEED_USER_ID, authorName: 'Samir L.', text: 'What product model did you switch to? Digital or physical?' },
    { user: SEED_USER_ID, authorName: 'Dina A.', text: 'The work style archetype was the most useful part of the DNA for me too.' },
    { user: SEED_USER_ID, authorName: 'Tariq M.', text: 'Builder gang! We build systems, not relationships. Embrace it.' },
  ]},
  { authorName: 'Fatima Al-Zahrawi', type: 'comment', text: 'Just shared my brand kit from the Launch Package with a potential investor. They said it was more professional than pitches from companies with 10x my budget. The AI got the colors, typography, and tone exactly right for the Saudi market. Do not skip the Launch Package — it is free and it works.', replies: [
    { user: SEED_USER_ID, authorName: 'Omar B.', text: 'Which section impressed them most? The brand story or the visual identity?' },
    { user: SEED_USER_ID, authorName: 'Lina K.', text: 'I used my brand kit to set up my Instagram. Saved me AED 2,000 on a designer.' },
    { user: SEED_USER_ID, authorName: 'Hassan R.', text: 'The brand voice section alone changed how I write all my emails and posts.' },
    { user: SEED_USER_ID, authorName: 'Amal J.', text: 'Sent mine to a designer friend. She said the color rationale was better than what most agencies deliver.' },
  ]},
  { authorName: 'Khalid Al-Mutairi', type: 'success', text: 'Week 3 update on my 30-day map: Week 1 talked to 22 potential customers. Week 2 ran a small ask test with a WhatsApp group. Week 3 first paid order — KWD 180. Nothing crazy but this is REAL validation. The map works if you actually follow it. Stop planning, start talking to people.', replies: [
    { user: SEED_USER_ID, authorName: 'Hana S.', text: 'Love this! Keep posting weekly updates. We are all following along.' },
    { user: SEED_USER_ID, authorName: 'Ali F.', text: 'KWD 180 is not nothing — that is proof someone will pay. Now multiply.' },
    { user: SEED_USER_ID, authorName: 'Salma W.', text: 'The detective phase was hard for me too but you are proving it works. Week 4 next!' },
    { user: SEED_USER_ID, authorName: 'Nasser G.', text: 'Can you share how you structured the WhatsApp small ask? I want to try the same.' },
  ]},
  { authorName: 'Amira Nour', type: 'question', text: 'For anyone using the Competitor Tracker — how often do you run manual analysis? I have 4 competitors tracked. Is weekly enough or should I analyze after every market event? The weekly digest is useful but sometimes I feel like I am missing mid-week moves.', replies: [
    { user: SEED_USER_ID, authorName: 'Ziad K.', text: 'Weekly is perfect. Only run manual if a competitor drops prices or launches something new. Otherwise you are overthinking it.' },
    { user: SEED_USER_ID, authorName: 'Reem A.', text: 'I run it Tuesday and Friday. Tuesday for the week start, Friday to prep for the weekend push.' },
    { user: SEED_USER_ID, authorName: 'Badr H.', text: '4 competitors is the sweet spot. More than 6 and the signal-to-noise ratio drops.' },
    { user: SEED_USER_ID, authorName: 'Yasmin T.', text: 'The threat level badges are helpful. I only deep-dive when something goes from Medium to High.' },
  ]},
  { authorName: 'Ibrahim Saad', type: 'comment', text: 'Hot take: most founders in MENA fail not because of bad ideas but because they never actually talk to customers. The Detective Phase in week 1 of the 30-day map was uncomfortable but necessary. I had 3 assumptions completely wrong about what people would pay for. Talking to 10 people saved me 6 months of building the wrong thing.', replies: [
    { user: SEED_USER_ID, authorName: 'Mariam E.', text: '1000% agree. I built an entire app before talking to a single user. Biggest mistake of my life.' },
    { user: SEED_USER_ID, authorName: 'Waleed N.', text: 'What were the 3 wrong assumptions? Would help us avoid the same.' },
    { user: SEED_USER_ID, authorName: 'Dania S.', text: 'The hardest part is hearing "I would not pay for this" — but that IS the value.' },
    { user: SEED_USER_ID, authorName: 'Karim Z.', text: 'Customer interviews are free. Building the wrong product costs everything.' },
  ]},
  { authorName: 'Nour Al-Din', type: 'success', text: 'Used the SEO keyword tool for my Cairo legal services firm. Found Arabic search terms with ZERO competition that I had no idea existed. Implemented them in week 1, saw traffic increase 40% by week 3. Arabic SEO is genuinely the most underused growth channel in MENA. If you are not ranking for Arabic keywords, you are leaving money on the table.', replies: [
    { user: SEED_USER_ID, authorName: 'Amira N.', text: 'Can you share which types of Arabic keywords worked best? Long-tail or short?' },
    { user: SEED_USER_ID, authorName: 'Sami B.', text: 'Legal services in Arabic — smart niche. Most competitors only optimize for English.' },
    { user: SEED_USER_ID, authorName: 'Leila M.', text: '40% in 3 weeks is insane. I need to try this for my dental practice.' },
    { user: SEED_USER_ID, authorName: 'Fares Y.', text: 'The Arabic content cluster map from the SEO tool basically gave me 6 months of blog topics.' },
  ]},
  { authorName: 'Rania Mahmoud', type: 'question', text: 'Has anyone tried the AI Chat Advisor for pricing strategy? I keep going back and forth between premium pricing and competitive pricing for my organic skincare line in Amman. The advisor gave me a framework but I want to hear real experiences from other MENA founders. What pricing approach worked for you in a market that haggles?', replies: [
    { user: SEED_USER_ID, authorName: 'Joud A.', text: 'Premium. Always. In Jordan especially — if you price low they assume low quality. Price high and they feel proud buying from you.' },
    { user: SEED_USER_ID, authorName: 'Laith K.', text: 'I did both. Started competitive to get first 50 customers, then raised 30%. Lost 5 customers, gained 20 new ones who wanted "the premium version."' },
    { user: SEED_USER_ID, authorName: 'Haya R.', text: 'The pricing strategy from the Launch Package gave me exact numbers. Followed them. Working so far.' },
    { user: SEED_USER_ID, authorName: 'Dana F.', text: 'For skincare specifically — free samples → Instagram story reviews → full price. That funnel converts in MENA.' },
  ]},
  { authorName: 'Tarek Osman', type: 'success', text: 'Just hit EGP 45,000 monthly revenue — started 4 months ago with zero. The AI Advisor told me straight up that my first idea (a delivery app) was too capital-intensive for my budget. Hurt to hear it. But it redirected me to a B2B cleaning supply subscription service that prints money. Sometimes the best advice is "do not do that."', replies: [
    { user: SEED_USER_ID, authorName: 'Mostafa H.', text: 'The advisor being honest instead of supportive is literally the best feature. Every other tool just tells you your idea is great.' },
    { user: SEED_USER_ID, authorName: 'Salwa D.', text: 'B2B subscriptions in Egypt are smart. Recurring revenue + businesses pay on time unlike consumers.' },
    { user: SEED_USER_ID, authorName: 'Hazem A.', text: 'EGP 45K/month from a cleaning supply subscription? That is brilliant. Low glamour, high margin.' },
    { user: SEED_USER_ID, authorName: 'Nermeen S.', text: 'This is proof that the boring businesses make money. Delivery apps are sexy but bankrupt you.' },
  ]},
];

let _seeded = false;
async function ensureSeeded() {
  if (_seeded) return;
  _seeded = true;
  try {
    // Check if seeds already exist by looking for the seed user ID
    const seedCount = await Post.countDocuments({ user: SEED_USER_ID });
    if (seedCount >= 10) return; // Already seeded
    // Remove old partial seeds and re-insert fresh
    await Post.deleteMany({ user: SEED_USER_ID });
    const docs = SEEDS.map((s, i) => ({
      user: SEED_USER_ID,
      authorName: s.authorName,
      type: s.type,
      text: s.text,
      likes: [],
      replies: s.replies.map(r => ({ ...r, createdAt: new Date(Date.now() - (i * 7200000 + 3600000)) })),
      pinned: i === 0,
      createdAt: new Date(Date.now() - (i + 1) * 7200000),
    }));
    await Post.insertMany(docs);
    console.log('✅ Community seeded with 10 posts + 40 replies');
  } catch (e) { console.warn('Community seed:', e.message); }
}

exports.getPosts = async (req, res) => {
  try {
    await ensureSeeded();
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
    const { text, type } = req.body;
    if (!text || text.trim().length < 3) return res.status(400).json({ error: 'Post text required' });
    const user = req.user;
    const post = await Post.create({
      user: user._id,
      authorName: user.name || 'Anonymous',
      type: type || 'comment',
      text: text.trim().slice(0, 1000),
    });
    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    await Post.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed.' }); }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    const uid = req.user._id.toString();
    const idx = post.likes.findIndex(l => l.toString() === uid);
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(req.user._id);
    await post.save();
    res.json({ success: true, likes: post.likes.length, liked: idx === -1 });
  } catch (err) { res.status(500).json({ error: 'Failed.' }); }
};

exports.addReply = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 1) return res.status(400).json({ error: 'Reply text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    post.replies.push({
      user: req.user._id,
      authorName: req.user.name || 'Anonymous',
      text: text.trim().slice(0, 500),
    });
    await post.save();
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ error: 'Failed.' }); }
};

exports.getStats = async (req, res) => {
  try {
    await ensureSeeded();
    const total = await Post.countDocuments();
    const members = await Post.distinct('authorName');
    res.json({ success: true, totalPosts: total, totalMembers: members.length });
  } catch (err) { res.status(500).json({ error: 'Failed.' }); }
};
