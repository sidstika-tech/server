const Competitor = require('../models/competitor.model');
const BusinessDNA = require('../models/businessDNA.model');
const { geminiChat, MASTER_IDENTITY } = require('../services/gemini.service');
const { createNotification } = require('./notification.controller');

/* ══════════════════════════════════════════════════════════════════
   COMPETITOR TRACKER
   This is the "eyes on the battlefield" feature.
   Every Monday the system asks Gemini:
     "Given what this user is building in their country, and given
      this competitor, what likely shifted this week? What does the
      user need to do about it?"
   The result is saved as a weekly intel entry AND sent as an
   in-app notification — the user opens the app and sees:
      "3 competitors moved this week. Here's what changed."
══════════════════════════════════════════════════════════════════ */

const MAX_COMPETITORS_PER_USER = 10;

/* ── Helpers ─────────────────────────────────────────────────────── */

function startOfThisWeekUTC() {
  // Monday 00:00 UTC of the current week
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

/* ── Core analysis prompt — the prompt does the real work ────────── */

async function analyzeCompetitor(competitor, dna) {
  const userBusiness  = dna?.matchResult?.businessMatch || dna?.industry || 'their business';
  const userCountry   = dna?.country || 'MENA region';
  const userIndustry  = dna?.industry || 'general';
  const userAdvantage = dna?.matchResult?.unfairAdvantage || dna?.skills || '';

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Today is ${today}. You are doing competitive intelligence for a real founder in ${userCountry}.

THE FOUNDER IS BUILDING:
${userBusiness}
Industry: ${userIndustry}
Their unfair advantage: ${userAdvantage}
Their market: ${userCountry}

THE COMPETITOR TO ANALYZE:
Name: ${competitor.name}
Website: ${competitor.website || 'unknown'}
Country/HQ: ${competitor.country || 'unknown'}
Industry: ${competitor.industry || userIndustry}
What they do: ${competitor.description || 'general competitor in the same space'}
Why this founder is tracking them: ${competitor.whyTracking || 'direct competitor'}

YOUR JOB:
This founder will read this once a week. They have 90 seconds. Your output must:
1. Tell them what likely SHIFTED this past week with this competitor — be specific even when speculating, and mark uncertainty honestly
2. Be tailored to ${userCountry} market dynamics — not generic Western competitive analysis
3. End with the single most important move THIS founder should make THIS week
4. Treat the founder with respect — they are smart, not a child

Return ONLY valid JSON, no markdown, no backticks:
{
  "summary": "3-4 sentences. The big picture of what's happening with ${competitor.name} right now and why this founder should care. Reference ${userCountry} market specifically when relevant.",
  "signals": {
    "pricing": "What's likely happening with their pricing or offers — or 'No major signal this week' if quiet",
    "product": "Product/feature/launch signals — or 'No major signal this week'",
    "marketing": "Marketing/social/content angle they're pushing — or 'No major signal this week'",
    "hiring": "Hiring signals that reveal strategy — or 'No major signal this week'",
    "funding": "Funding, partnerships, or capital moves — or 'No major signal this week'"
  },
  "yourMove": "The ONE specific action this founder should take this week in response. Real action — not 'monitor the situation'. Reference their unfair advantage when relevant.",
  "threatLevel": "low | medium | high | critical — based on how directly this affects the founder's lane RIGHT NOW"
}`;

  const system = `${MASTER_IDENTITY}

You are a competitive intelligence analyst who has watched MENA markets for 15 years. You know the difference between noise and signal. You write briefings the way a trusted partner would — confident where you can be, honest where you can't. Return ONLY valid JSON.`;

  const raw = await geminiChat(prompt, system);
  const clean = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(clean);

  return {
    summary: String(parsed.summary || '').slice(0, 4000),
    signals: {
      pricing:   String(parsed.signals?.pricing   || '').slice(0, 600),
      product:   String(parsed.signals?.product   || '').slice(0, 600),
      marketing: String(parsed.signals?.marketing || '').slice(0, 600),
      hiring:    String(parsed.signals?.hiring    || '').slice(0, 600),
      funding:   String(parsed.signals?.funding   || '').slice(0, 600),
    },
    yourMove: String(parsed.yourMove || '').slice(0, 800),
    threatLevel: ['low','medium','high','critical'].includes(parsed.threatLevel) ? parsed.threatLevel : 'medium',
  };
}

/* ── REST endpoints ─────────────────────────────────────────────── */

// GET /api/competitors — list user's tracked competitors
exports.list = async (req, res) => {
  try {
    const competitors = await Competitor.find({ user: req.user._id })
      .sort('-updatedAt')
      .lean();
    res.json({ success: true, competitors, max: MAX_COMPETITORS_PER_USER });
  } catch (err) {
    console.error('competitor.list error:', err);
    res.status(500).json({ error: 'Failed to load competitors.' });
  }
};

// POST /api/competitors — add a competitor
exports.add = async (req, res) => {
  try {
    const { name, website, country, industry, description, whyTracking } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Competitor name is required' });

    const count = await Competitor.countDocuments({ user: req.user._id });
    if (count >= MAX_COMPETITORS_PER_USER) {
      return res.status(403).json({
        error: `You can track up to ${MAX_COMPETITORS_PER_USER} competitors. Remove one to add another.`,
      });
    }

    const competitor = await Competitor.create({
      user: req.user._id,
      name: name.trim().slice(0, 120),
      website: (website || '').trim().slice(0, 300),
      country: (country || '').trim().slice(0, 80),
      industry: (industry || '').trim().slice(0, 160),
      description: (description || '').trim().slice(0, 1000),
      whyTracking: (whyTracking || '').trim().slice(0, 500),
    });

    res.status(201).json({ success: true, competitor });
  } catch (err) {
    console.error('competitor.add error:', err);
    res.status(500).json({ error: 'Failed to add competitor.' });
  }
};

// PUT /api/competitors/:id — update competitor details or preferences
exports.update = async (req, res) => {
  try {
    const allowed = ['name','website','country','industry','description','whyTracking','active','notify'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    if (!competitor) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true, competitor });
  } catch (err) {
    console.error('competitor.update error:', err);
    res.status(500).json({ error: 'Failed to update.' });
  }
};

// DELETE /api/competitors/:id — stop tracking
exports.remove = async (req, res) => {
  try {
    await Competitor.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('competitor.remove error:', err);
    res.status(500).json({ error: 'Failed to remove.' });
  }
};

// POST /api/competitors/:id/analyze — manually trigger an analysis (user-initiated)
exports.analyzeNow = async (req, res) => {
  try {
    const competitor = await Competitor.findOne({ _id: req.params.id, user: req.user._id });
    if (!competitor) return res.status(404).json({ error: 'Not found' });

    const dna = await BusinessDNA.findOne({ user: req.user._id });

    const intel = await analyzeCompetitor(competitor, dna);
    const entry = { ...intel, weekOf: startOfThisWeekUTC() };

    competitor.intel.unshift(entry);
    // Keep the latest 12 weeks
    if (competitor.intel.length > 12) competitor.intel = competitor.intel.slice(0, 12);
    competitor.lastAnalyzedAt = new Date();
    await competitor.save();

    res.json({ success: true, intel: entry, competitor });
  } catch (err) {
    console.error('competitor.analyzeNow error:', err.message);
    res.status(500).json({ error: 'Analysis failed. Please try again in a moment.' });
  }
};

// GET /api/competitors/:id — get one competitor with full intel history
exports.getOne = async (req, res) => {
  try {
    const competitor = await Competitor.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!competitor) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, competitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load.' });
  }
};

/* ══════════════════════════════════════════════════════════════════
   WEEKLY DIGEST RUNNER
   Designed to be called by:
   - Vercel Cron (/api/cron/competitor-digest with x-cron-secret header)
   - Or a manual admin trigger
   Loops every active user with at least one active competitor.
   For each user: analyzes all their competitors, builds ONE digest
   notification summarizing what moved, and saves intel entries.
══════════════════════════════════════════════════════════════════ */

exports.runWeeklyDigest = async (req, res) => {
  // Cron-secret protection — supports both Vercel-cron Authorization Bearer header
  // and our own x-cron-secret header (for manual triggers / other schedulers).
  const expected = process.env.CRON_SECRET;
  if (!expected) return res.status(500).json({ error: 'CRON_SECRET not configured' });

  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const customSecret = req.headers['x-cron-secret'];

  if (bearer !== expected && customSecret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const weekOf = startOfThisWeekUTC();
    const stats = { users: 0, competitorsAnalyzed: 0, notifications: 0, errors: 0 };

    // Group competitors by user
    const userIds = await Competitor.distinct('user', { active: true });

    for (const userId of userIds) {
      stats.users++;
      try {
        const competitors = await Competitor.find({ user: userId, active: true, 'notify.weekly': true });
        if (!competitors.length) continue;

        const dna = await BusinessDNA.findOne({ user: userId });
        const movedItems = []; // For the digest

        for (const c of competitors) {
          try {
            const intel = await analyzeCompetitor(c, dna);
            const entry = { ...intel, weekOf };

            c.intel.unshift(entry);
            if (c.intel.length > 12) c.intel = c.intel.slice(0, 12);
            c.lastAnalyzedAt = new Date();
            await c.save();

            movedItems.push({
              name: c.name,
              threatLevel: intel.threatLevel,
              yourMove: intel.yourMove,
              summary: intel.summary,
            });
            stats.competitorsAnalyzed++;
          } catch (innerErr) {
            console.error(`Competitor analysis failed for ${c._id}:`, innerErr.message);
            stats.errors++;
          }
        }

        if (movedItems.length) {
          // Build one combined notification — "X competitors moved this week"
          const critical = movedItems.filter(m => m.threatLevel === 'critical' || m.threatLevel === 'high');
          const title = critical.length
            ? `⚔ ${critical.length} competitor${critical.length > 1 ? 's' : ''} made a serious move this week`
            : `📡 Your weekly competitor briefing is ready (${movedItems.length} tracked)`;

          const bodyLines = movedItems.slice(0, 5).map(m =>
            `• ${m.name} (${m.threatLevel}): ${m.yourMove.slice(0, 160)}`
          );
          const body = bodyLines.join('\n');

          await createNotification({
            user: userId,
            type: 'competitor_update',
            title,
            body,
            icon: critical.length ? '⚔' : '📡',
            actionUrl: '/pages/competitor.html',
            actionLabel: 'Read full briefing →',
            meta: { weekOf, count: movedItems.length, criticalCount: critical.length },
            sendEmail: true,  // marked for email delivery when the worker runs
          });
          stats.notifications++;
        }
      } catch (userErr) {
        console.error(`Digest failed for user ${userId}:`, userErr.message);
        stats.errors++;
      }
    }

    res.json({ success: true, weekOf, stats });
  } catch (err) {
    console.error('runWeeklyDigest error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ── Test/preview endpoint — lets a user trigger their own digest now ──
   Useful for debugging + onboarding ("see what your weekly looks like") */
exports.previewMyDigest = async (req, res) => {
  try {
    const competitors = await Competitor.find({ user: req.user._id, active: true });
    if (!competitors.length) return res.json({ success: true, message: 'No competitors tracked yet.', items: [] });

    const dna = await BusinessDNA.findOne({ user: req.user._id });
    const weekOf = startOfThisWeekUTC();
    const items = [];

    for (const c of competitors) {
      try {
        const intel = await analyzeCompetitor(c, dna);
        items.push({ name: c.name, ...intel });
        c.intel.unshift({ ...intel, weekOf });
        if (c.intel.length > 12) c.intel = c.intel.slice(0, 12);
        c.lastAnalyzedAt = new Date();
        await c.save();
      } catch (e) {
        console.error(`preview analysis failed for ${c._id}:`, e.message);
      }
    }

    // Create the user-facing notification so they see how it looks
    if (items.length) {
      const critical = items.filter(i => i.threatLevel === 'critical' || i.threatLevel === 'high');
      await createNotification({
        user: req.user._id,
        type: 'competitor_update',
        title: critical.length
          ? `⚔ ${critical.length} competitor${critical.length > 1 ? 's' : ''} made a serious move`
          : `📡 Your competitor briefing is ready (${items.length} tracked)`,
        body: items.slice(0, 5).map(i => `• ${i.name} (${i.threatLevel}): ${i.yourMove.slice(0, 160)}`).join('\n'),
        icon: critical.length ? '⚔' : '📡',
        actionUrl: '/pages/competitor.html',
        actionLabel: 'Read full briefing →',
        meta: { weekOf, count: items.length, preview: true },
      });
    }

    res.json({ success: true, weekOf, items });
  } catch (err) {
    console.error('previewMyDigest error:', err);
    res.status(500).json({ error: 'Preview failed.' });
  }
};
