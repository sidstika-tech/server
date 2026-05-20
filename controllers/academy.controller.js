const { generateAcademyDaily, geminiChat, MASTER_IDENTITY } = require('../services/gemini.service');
const AcademyProgress = require('../models/academyProgress.model');
const BusinessDNA = require('../models/businessDNA.model');
const { createNotification } = require('./notification.controller');

/* ══════════════════════════════════════════════════════════════════
   ACADEMY CONTROLLER
   Two systems live here:
   1. DAILY NEWS — auto-curated cards via Gemini (the "what's
      happening today" tab), cached per-day server-wide.
   2. THE FOUNDER'S PATH — a 5-step guided learning system, each
      step has 5 sessions. Sessions unlock sequentially. Progress
      tracked per user. Sessions are dynamic content generated
      by Gemini, customized to the user's Business DNA when
      available — so a Cairo founder learns from Cairo examples,
      not Silicon Valley ones.
══════════════════════════════════════════════════════════════════ */

// ── DAILY NEWS CACHE ───────────────────────────────────────────────
let _newsCache = null;
let _newsCacheDate = null;
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════════════════════════
   THE FOUNDER'S PATH — 5 steps × 5 sessions = 25 sessions total
   The structure is locked. The CONTENT of each session is generated
   on demand and personalized to the user's DNA.

   Step ordering is intentional:
   1. MINDSET     → without this, the other 4 fail
   2. VALIDATION  → prove before you build, not after
   3. POSITIONING → why anyone should care
   4. LAUNCH      → first paying customer, real revenue
   5. GROWTH      → scale beyond yourself
══════════════════════════════════════════════════════════════════ */

const PATH = [
  {
    id: 'step1',
    number: 1,
    title: 'Mindset',
    subtitle: 'Become the person who can build it',
    icon: '🧠',
    color: '#a855f7',
    description: 'Most ideas die not from market failure but from founder collapse. This step rewires how you think — so you can do what most can\'t.',
    sessions: [
      { id: 'step1.session1', title: 'The First Lie You Believed', duration: '12 min', focus: 'Identifying the inherited beliefs about money and business that are quietly limiting you.' },
      { id: 'step1.session2', title: 'Risk Is Not What You Think It Is', duration: '14 min', focus: 'Why staying safe is the riskiest move — and how to reframe risk with discipline, not fear.' },
      { id: 'step1.session3', title: 'The Identity Shift', duration: '15 min', focus: 'Stop trying to start a business. Start becoming someone who runs one. The language, habits, and decisions of a founder.' },
      { id: 'step1.session4', title: 'Working With Doubt, Not Against It', duration: '11 min', focus: 'Doubt is a permanent companion, not an enemy. How top founders use it instead of being crushed by it.' },
      { id: 'step1.session5', title: 'Your 5-Year Identity Statement', duration: '13 min', focus: 'Write the single paragraph that defines who you will be — the document you return to when things get hard.' },
    ],
  },
  {
    id: 'step2',
    number: 2,
    title: 'Validation',
    subtitle: 'Prove it before you waste a dirham',
    icon: '🔬',
    color: '#3b82f6',
    description: 'Ideas feel good. Evidence makes money. Learn the exact tests to run before you build anything you can\'t take back.',
    sessions: [
      { id: 'step2.session1', title: 'The Painful Truth About Your Idea', duration: '14 min', focus: 'How to talk to 10 potential customers without pitching — and learn what they\'ll actually pay for.' },
      { id: 'step2.session2', title: 'The 100 Dirham Test', duration: '12 min', focus: 'Get someone to hand you cash before you build anything. The cheapest validation experiment in the world.' },
      { id: 'step2.session3', title: 'Reading Your Market Without Spending', duration: '15 min', focus: 'Free tools — Google Trends, Instagram hashtag analysis, marketplace listings — that reveal real demand in your country.' },
      { id: 'step2.session4', title: 'Killing Ideas Early Saves Years', duration: '11 min', focus: 'The 3 questions that tell you to walk away — and why this is the most valuable skill a founder learns.' },
      { id: 'step2.session5', title: 'The Validation Pitch', duration: '13 min', focus: 'A 60-second script you can use anywhere — coffee shops, weddings, WhatsApp — to test demand without sounding desperate.' },
    ],
  },
  {
    id: 'step3',
    number: 3,
    title: 'Positioning',
    subtitle: 'Why you, why now, why this',
    icon: '🎯',
    color: '#f59e0b',
    description: 'The market is loud. Generic dies. Sharp positioning is what makes someone choose YOU when they have 10 other options.',
    sessions: [
      { id: 'step3.session1', title: 'The One Sentence That Sells', duration: '13 min', focus: 'Crafting your positioning statement so it stops scrollers and converts skeptics — in Arabic and English.' },
      { id: 'step3.session2', title: 'Your Unfair Advantage', duration: '14 min', focus: 'Identifying the unique combination of skills, network, and timing that competitors literally cannot copy.' },
      { id: 'step3.session3', title: 'Pricing as Positioning', duration: '12 min', focus: 'Your price tells customers more about you than your website. How to price for the position you want, not the one you have.' },
      { id: 'step3.session4', title: 'The Story That Travels', duration: '15 min', focus: 'Crafting the founder story that gets retold without you. WhatsApp-friendly. Wedding-friendly. Investor-friendly.' },
      { id: 'step3.session5', title: 'Owning a Word in Your Market', duration: '11 min', focus: 'Pick one word the market already wants — and own it harder than anyone else in your country.' },
    ],
  },
  {
    id: 'step4',
    number: 4,
    title: 'Launch',
    subtitle: 'Get to the first paying customer',
    icon: '🚀',
    color: '#10b981',
    description: 'Nothing matters until cash is in your account. This step is execution, not theory — daily tactics to get to revenue fast.',
    sessions: [
      { id: 'step4.session1', title: 'The Minimum You Need to Launch', duration: '14 min', focus: 'Strip away everything that isn\'t the offer, the customer, and the way to pay. Launch in 7 days, not 7 months.' },
      { id: 'step4.session2', title: 'Your First 10 Customers — Where They Live', duration: '13 min', focus: 'Specific places to find your first 10 paying customers in your country — WhatsApp groups, niche communities, Bayt, Instagram.' },
      { id: 'step4.session3', title: 'The DM That Converts', duration: '12 min', focus: 'Word-for-word DM scripts for Instagram, WhatsApp, and LinkedIn that get replies — not blocks.' },
      { id: 'step4.session4', title: 'Handling The First "No"', duration: '11 min', focus: 'Why the first rejection is the most valuable signal you\'ll receive — and how to respond without losing the relationship.' },
      { id: 'step4.session5', title: 'The Launch Week Playbook', duration: '15 min', focus: 'A day-by-day breakdown of launch week: announcements, follow-ups, social proof, and the close.' },
    ],
  },
  {
    id: 'step5',
    number: 5,
    title: 'Growth',
    subtitle: 'Make it bigger than yourself',
    icon: '📈',
    color: '#ef4444',
    description: 'A business that depends on you is a job. Step 5 is where you build systems, hire, delegate, and become a real founder.',
    sessions: [
      { id: 'step5.session1', title: 'The First Hire That Multiplies You', duration: '14 min', focus: 'Most founders hire the wrong first person. The single role that pays for itself in 60 days.' },
      { id: 'step5.session2', title: 'Systems That Run Without You', duration: '13 min', focus: 'Building SOPs and checklists so the business operates whether you\'re there or not. The tools to use in MENA.' },
      { id: 'step5.session3', title: 'Pricing Power and Margin Expansion', duration: '15 min', focus: 'When and how to raise prices without losing customers — and why most MENA founders price 30% too low.' },
      { id: 'step5.session4', title: 'Capital When You Need It', duration: '12 min', focus: 'Bootstrapping vs. raising — when each makes sense, and the MENA investors who actually fund early.' },
      { id: 'step5.session5', title: 'The Founder Who Doesn\'t Burn Out', duration: '14 min', focus: 'The exact systems — daily, weekly, quarterly — that keep founders sane while building something big.' },
    ],
  },
];

// Lookup helper
function findSession(sessionId) {
  for (const step of PATH) {
    const s = step.sessions.find(x => x.id === sessionId);
    if (s) return { step, session: s };
  }
  return null;
}

/* ── Progress helpers ──────────────────────────────────────────────────── */

async function getOrCreateProgress(userId) {
  let p = await AcademyProgress.findOne({ user: userId });
  if (!p) p = await AcademyProgress.create({ user: userId });
  return p;
}

function isSessionUnlocked(progress, sessionId) {
  const completedIds = new Set(progress.completed.map(c => c.sessionId));
  // First session of step 1 is always unlocked
  if (sessionId === 'step1.session1') return true;
  // Find session position
  for (let i = 0; i < PATH.length; i++) {
    const step = PATH[i];
    for (let j = 0; j < step.sessions.length; j++) {
      if (step.sessions[j].id !== sessionId) continue;
      if (j > 0) {
        // Need the previous session in same step
        return completedIds.has(step.sessions[j - 1].id);
      } else {
        // First session of this step — need the last session of previous step
        if (i === 0) return true;
        const prevStep = PATH[i - 1];
        return completedIds.has(prevStep.sessions[prevStep.sessions.length - 1].id);
      }
    }
  }
  return false;
}

function buildPathStatus(progress) {
  const completedIds = new Set(progress.completed.map(c => c.sessionId));
  return PATH.map(step => ({
    id: step.id,
    number: step.number,
    title: step.title,
    subtitle: step.subtitle,
    icon: step.icon,
    color: step.color,
    description: step.description,
    sessions: step.sessions.map(s => ({
      id: s.id,
      title: s.title,
      duration: s.duration,
      focus: s.focus,
      completed: completedIds.has(s.id),
      unlocked: isSessionUnlocked(progress, s.id),
    })),
    completedCount: step.sessions.filter(s => completedIds.has(s.id)).length,
    totalCount: step.sessions.length,
  }));
}

/* ══════════════════════════════════════════════════════════════════
   ENDPOINTS
══════════════════════════════════════════════════════════════════ */

// GET /api/academy/daily — daily news cards (unchanged behaviour)
exports.getDaily = async (req, res) => {
  try {
    const today = todayStr();
    if (_newsCache && _newsCacheDate === today) {
      return res.json({ success: true, data: _newsCache, cached: true });
    }
    const data = await generateAcademyDaily();
    _newsCache = data;
    _newsCacheDate = today;
    res.json({ success: true, data, cached: false });
  } catch (err) {
    console.error('Academy daily error:', err.message);
    // Fallback so page never breaks — keeps the MENA-only promise even when Gemini fails
    res.json({
      success: true,
      cached: false,
      data: {
        cards: [
          { id: 'card1', type: 'market', icon: '📈', country: 'Saudi Arabia', countryFlag: '🇸🇦', category: 'MENA Markets',
            title: 'Tadawul holds steady as Vision 2030 capex keeps flowing',
            summary: 'Saudi giga-project spending continues feeding non-oil sectors. SMEs aligned to Vision 2030 priorities are winning faster contracts than ever.',
            opportunity: 'Map one Vision 2030 pillar to your offering this week — tourism, sport, entertainment, logistics, health, or housing.',
            source: 'Argaam', sourceUrl: 'https://www.argaam.com' },
          { id: 'card2', type: 'success', icon: '🏆', country: 'UAE', countryFlag: '🇦🇪', category: 'MENA Founder Story',
            title: 'Tabby reshaped MENA fintech by obsessing over one customer pain',
            summary: 'Tabby built a billion-dollar BNPL business by solving instalment friction for Gulf shoppers. The pattern: pick one painful moment and rebuild it.',
            opportunity: 'Identify the single most painful moment your customer experiences and rebuild only that — nothing else.',
            source: 'Forbes Middle East', sourceUrl: 'https://www.forbesmiddleeast.com' },
          { id: 'card3', type: 'opportunity', icon: '🚀', country: 'Egypt', countryFlag: '🇪🇬', category: 'MENA Opportunity',
            title: 'Egyptian e-commerce sellers winning as imported goods slow down',
            summary: 'Currency pressure on Egyptian imports is creating space for local makers. Niche locally-produced lines are taking market share that imports used to own.',
            opportunity: 'If you have any local production angle, list one SKU on Jumia or Instagram this week with "صناعة محلية" (locally made) as the headline.',
            source: 'MENAbytes', sourceUrl: 'https://www.menabytes.com' },
        ],
        generatedAt: today,
      }
    });
  }
};

// POST /api/academy/refresh — admin force refresh
exports.refresh = async (req, res) => {
  try {
    _newsCache = null;
    _newsCacheDate = null;
    const data = await generateAcademyDaily();
    _newsCache = data;
    _newsCacheDate = todayStr();
    res.json({ success: true, data });
  } catch (err) {
    console.error('academy.refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh content.' });
  }
};

// GET /api/academy/path — return the 5-step path with user's progress
exports.getPath = async (req, res) => {
  try {
    const progress = await getOrCreateProgress(req.user._id);
    const steps = buildPathStatus(progress);

    const totalSessions = PATH.reduce((sum, s) => sum + s.sessions.length, 0);
    const completedCount = progress.completed.length;
    const percent = Math.round((completedCount / totalSessions) * 100);

    res.json({
      success: true,
      currentStep: progress.currentStep,
      streak: progress.streak,
      completedCount,
      totalSessions,
      percent,
      steps,
    });
  } catch (err) {
    console.error('academy.getPath error:', err);
    res.status(500).json({ error: 'Failed to load your path.' });
  }
};

// GET /api/academy/session/:sessionId — get full session content (generates dynamically)
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const found = findSession(sessionId);
    if (!found) return res.status(404).json({ error: 'Session not found' });

    const progress = await getOrCreateProgress(req.user._id);
    if (!isSessionUnlocked(progress, sessionId)) {
      return res.status(403).json({ error: 'Complete the previous session first.' });
    }

    // Personalize content with user's DNA if available
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    const userName  = req.user.name || 'friend';
    const country   = dna?.country || 'your country';
    const industry  = dna?.industry || 'your field';
    const business  = dna?.matchResult?.businessMatch || 'what you are building';

    const { step, session } = found;
    const prompt = `Write a complete, deeply useful Academy lesson for a real entrepreneur.

THIS LESSON IS PART OF "The Founder's Path":
Step ${step.number} of 5: ${step.title} — ${step.subtitle}
Step description: ${step.description}

SESSION: ${session.title}
Focus: ${session.focus}
Target duration: ${session.duration} to read

THE PERSON READING THIS:
Name: ${userName}
Country: ${country}
Industry: ${industry}
What they're building: ${business}

WHAT MAKES THIS LESSON LANDS:
1. Talk TO ${userName}, not at "the reader" — make this feel like one person mentoring another
2. Use ${country}-specific examples wherever possible — not Silicon Valley
3. The lesson must include: a hook that makes them keep reading, the core idea explained clearly, 2-3 real examples (MENA-flavored), one mental model they take with them, and 1-2 specific actions they can take in the next 48 hours
4. End with a reflection question they could answer in 1-2 sentences
5. No fluff. No "in conclusion." No corporate speak. Write like a wise older sibling who's been through it.

Return the lesson as clean markdown with these sections:
## The Opening
(The hook — 2-3 sentences that grab attention)

## The Core Idea
(The main lesson — the one thing they MUST take away)

## What This Actually Looks Like
(2-3 real-world examples, ideally MENA-flavored)

## The Mental Model
(One framework, metaphor, or mental shortcut to carry forward)

## Your Move
(1-2 specific, doable actions for the next 48 hours)

## The Question
(One question for the reader to sit with — write it as a question they can journal on)`;

    const system = `${MASTER_IDENTITY}

You are writing a single lesson in a 5-step founder's path. Your readers are mostly first-generation entrepreneurs across MENA. Be specific, warm, honest, and culturally aware. Never use Western-centric defaults. Write in clean markdown with the section headers requested.`;

    const content = await geminiChat(prompt, system);

    res.json({
      success: true,
      step: { id: step.id, number: step.number, title: step.title, icon: step.icon, color: step.color },
      session: { id: session.id, title: session.title, duration: session.duration, focus: session.focus },
      content,
      unlocked: true,
      completed: progress.completed.some(c => c.sessionId === sessionId),
    });
  } catch (err) {
    console.error('academy.getSession error:', err.message);
    res.status(500).json({ error: 'Failed to load the session content. Please try again.' });
  }
};

// POST /api/academy/session/:sessionId/complete — mark session done
exports.completeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reflection } = req.body || {};

    const found = findSession(sessionId);
    if (!found) return res.status(404).json({ error: 'Session not found' });

    const progress = await getOrCreateProgress(req.user._id);

    if (!isSessionUnlocked(progress, sessionId)) {
      return res.status(403).json({ error: 'You haven\'t unlocked this session yet.' });
    }

    if (progress.completed.some(c => c.sessionId === sessionId)) {
      return res.json({ success: true, message: 'Already completed.', progress });
    }

    progress.completed.push({
      sessionId,
      completedAt: new Date(),
      reflection: String(reflection || '').slice(0, 1000),
    });

    // Update streak
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = progress.streak.lastActiveDate ? new Date(progress.streak.lastActiveDate) : null;
    if (last) last.setHours(0, 0, 0, 0);
    const diffDays = last ? Math.round((today - last) / (1000 * 60 * 60 * 24)) : null;

    if (diffDays === 0) {
      // Same day — no change
    } else if (diffDays === 1) {
      progress.streak.current += 1;
    } else {
      progress.streak.current = 1;
    }
    progress.streak.longest = Math.max(progress.streak.longest, progress.streak.current);
    progress.streak.lastActiveDate = new Date();

    // Update currentStep based on completion pattern
    for (let i = 0; i < PATH.length; i++) {
      const step = PATH[i];
      const stepDone = step.sessions.every(s => progress.completed.some(c => c.sessionId === s.id) || s.id === sessionId);
      if (!stepDone) { progress.currentStep = i + 1; break; }
      if (i === PATH.length - 1) progress.currentStep = 5;
    }

    // Milestones
    if (!progress.milestones.firstSession) progress.milestones.firstSession = new Date();
    const total = PATH.reduce((sum, s) => sum + s.sessions.length, 0);
    const done = progress.completed.length;
    if (done >= Math.ceil(total / 2) && !progress.milestones.halfwayDone) progress.milestones.halfwayDone = new Date();
    if (done === total && !progress.milestones.pathComplete) progress.milestones.pathComplete = new Date();

    // Detect "step just completed" — fire notification
    const { step } = found;
    const stepNowComplete = step.sessions.every(s => progress.completed.some(c => c.sessionId === s.id));
    if (stepNowComplete && !progress.milestones.firstStepComplete) {
      progress.milestones.firstStepComplete = new Date();
    }

    await progress.save();

    if (stepNowComplete) {
      await createNotification({
        user: req.user._id,
        type: 'academy_milestone',
        title: `🎓 Step ${step.number} complete: ${step.title}`,
        body: `You just finished all 5 sessions of "${step.title}". The next step — ${step.number < 5 ? PATH[step.number].title : 'Growth'} — is unlocked. Founders who complete this whole path show measurably different outcomes 6 months in.`,
        icon: '🎓',
        actionUrl: '/pages/academy.html',
        actionLabel: 'Continue the path →',
      });
    }

    res.json({
      success: true,
      progress: {
        completedCount: progress.completed.length,
        currentStep: progress.currentStep,
        streak: progress.streak,
        milestones: progress.milestones,
      },
      stepCompleted: stepNowComplete,
    });
  } catch (err) {
    console.error('academy.completeSession error:', err);
    res.status(500).json({ error: 'Failed to mark complete.' });
  }
};

// GET /api/academy/progress — lightweight progress summary
exports.getProgress = async (req, res) => {
  try {
    const progress = await getOrCreateProgress(req.user._id);
    const total = PATH.reduce((sum, s) => sum + s.sessions.length, 0);
    res.json({
      success: true,
      currentStep: progress.currentStep,
      completedCount: progress.completed.length,
      totalSessions: total,
      streak: progress.streak,
      milestones: progress.milestones,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed.' });
  }
};
