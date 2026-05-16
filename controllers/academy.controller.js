const { generateAcademyDaily } = require('../services/gemini.service');

// Simple in-memory cache — survives server restarts via MongoDB if needed
let _cache = null;
let _cacheDate = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/academy/daily
exports.getDaily = async (req, res) => {
  try {
    const today = todayStr();

    // Return cache if already generated today
    if (_cache && _cacheDate === today) {
      return res.json({ success: true, data: _cache, cached: true });
    }

    // Generate fresh content from Gemini
    const data = await generateAcademyDaily();
    _cache = data;
    _cacheDate = today;

    res.json({ success: true, data, cached: false });
  } catch (err) {
    console.error('Academy daily error:', err.message);
    // Return fallback so page never breaks
    res.json({
      success: true,
      cached: false,
      data: {
        featured: {
          title: 'The Power of Compounding in Business',
          category: 'strategy',
          description: 'Small, consistent improvements in every area of your business lead to extraordinary results over time. The top 1% of businesses all share one trait: they never stop optimizing.',
          keyLesson: 'A 1% improvement daily results in 37x growth over a year.',
          source: 'Double Eight AI Editorial',
          icon: '📈'
        },
        insights: [
          { title: 'Why Most Startups Fail Before Year 2', category: 'startup', summary: 'Cash flow, not lack of customers, kills most early businesses. Master your numbers first.', icon: '⚠️', tag: 'Startup' },
          { title: 'The $0 Marketing Stack That Works', category: 'marketing', summary: 'Content + SEO + community = a compound marketing machine that pays forever.', icon: '📢', tag: 'Marketing' },
          { title: 'How to Price for Maximum Profit', category: 'finance', summary: 'Value-based pricing consistently outperforms cost-plus — charge for outcomes, not time.', icon: '💰', tag: 'Finance' },
          { title: 'The Mindset Shift Every Founder Needs', category: 'mindset', summary: 'Stop thinking like an employee. Start thinking in systems, leverage, and outcomes.', icon: '🧠', tag: 'Mindset' },
          { title: 'Sales Without Selling', category: 'sales', summary: 'Build trust and authority first. The best salespeople never feel like they are selling at all.', icon: '🎯', tag: 'Sales' },
        ],
        generatedAt: today
      }
    });
  }
};

// POST /api/academy/refresh  (admin only — force regenerate)
exports.refresh = async (req, res) => {
  try {
    _cache = null;
    _cacheDate = null;
    const data = await generateAcademyDaily();
    _cache = data;
    _cacheDate = todayStr();
    res.json({ success: true, data });
  } catch (err) {
    console.error('academy.refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh content.' });
  }
};
