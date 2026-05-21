const BusinessDNA = require('../models/businessDNA.model');
const { openaiChat } = require('../services/gemini.service');

/* ══════════════════════════════════════════════════════════════════
   BUSINESS DNA — PSYCHOLOGICAL ARCHITECT & TALENT HUNTER
   This is NOT a business strategist. This is a psychologist who:
   - Reads who the user is between the lines of their 8 answers
   - Finds hidden strengths they don't see in themselves
   - Detects work style + motivation fuel + risk DNA
   - Designs the Road of Least Resistance — psychology first, market second
   - Builds a 30-day failure-proof map shaped by THEIR personality
══════════════════════════════════════════════════════════════════ */

// Light country context — for market grounding only, NOT the main driver
const COUNTRY_CONTEXT = {
  'Saudi Arabia':{ currency:'SAR', hub:'Riyadh' },
  'UAE':         { currency:'AED', hub:'Dubai' },
  'Egypt':       { currency:'EGP', hub:'Cairo' },
  'Qatar':       { currency:'QAR', hub:'Doha' },
  'Kuwait':      { currency:'KWD', hub:'Kuwait City' },
  'Bahrain':     { currency:'BHD', hub:'Manama' },
  'Oman':        { currency:'OMR', hub:'Muscat' },
  'Jordan':      { currency:'JOD', hub:'Amman' },
  'Morocco':     { currency:'MAD', hub:'Casablanca' },
  'Lebanon':     { currency:'LBP', hub:'Beirut' },
};

function ctxFor(country) {
  return COUNTRY_CONTEXT[country] || { currency: 'USD', hub: country || 'your city' };
}

/* ── GET /api/business-dna ─────────────────────────────────────── */
exports.getDNA = async (req, res) => {
  try {
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    res.json({ success: true, dna });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load DNA' });
  }
};

/* ── POST /api/business-dna/generate ───────────────────────────── */
exports.generateDNA = async (req, res) => {
  try {
    const body = req.body || {};
    const userName = (body.name || req.user.name || 'friend').trim();
    const country  = (body.country || '').trim();
    const city     = (body.city || '').trim();
    const language = body.language === 'ar' ? 'ar' : 'en';
    const a = body.answers || {};

    // Validate the 8 answers — all required, all must be at least 5 chars
    const required = ['proudOf','energySource','couldDoBetter','peopleAskFor','whatYouHate','whatStopsYou','successLooksLike','naturalMedium','budget'];
    for (const k of required) {
      if (!a[k] || String(a[k]).trim().length < 3) {
        return res.status(400).json({ error: `Please answer all 9 questions. Missing or too short: ${k}` });
      }
    }

    const ctx = ctxFor(country);

    const prompt = buildArchitectPrompt({ userName, country, city, ctx, answers: a });

    const raw = await openaiChat(
      prompt,
      `You are a Psychological Architect & Talent Hunter. You read humans between the lines. You don't match resumes to industries — you match psychology + behavior patterns + hidden strengths to a life path. You see the user more clearly than they see themselves. You write like a wise older sibling who has watched them quietly and finally tells them what you've seen. You only output valid JSON.`,
      {
        temperature: 0.9,
        topP: 0.95,
        json: true,
        language,
      }
    );

    let parsed;
    try {
      const clean = String(raw).trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('DNA parse error:', parseErr.message, '\nRAW:', String(raw).slice(0, 400));
      return res.status(500).json({ error: 'Could not parse psychological profile. Please try again.' });
    }

    // ── Save full DNA ──
    const dnaDoc = {
      user: req.user._id,
      name: userName,
      country,
      city,
      language,
      answers: {
        proudOf:          String(a.proudOf).slice(0, 2000),
        energySource:     String(a.energySource).slice(0, 2000),
        couldDoBetter:    String(a.couldDoBetter).slice(0, 2000),
        peopleAskFor:     String(a.peopleAskFor).slice(0, 2000),
        whatYouHate:      String(a.whatYouHate).slice(0, 2000),
        whatStopsYou:     String(a.whatStopsYou).slice(0, 2000),
        successLooksLike: String(a.successLooksLike).slice(0, 2000),
        naturalMedium:    String(a.naturalMedium).slice(0, 200),
        budget:           String(a.budget).slice(0, 100),
      },
      profile: {
        whoYouAre:      str(parsed?.profile?.whoYouAre),
        realStrength:   str(parsed?.profile?.realStrength),
        workStyle:      str(parsed?.profile?.workStyle),
        energyType:     str(parsed?.profile?.energyType),
        motivationFuel: str(parsed?.profile?.motivationFuel),
        riskDNA:        str(parsed?.profile?.riskDNA),
        avoidAtAllCost: str(parsed?.profile?.avoidAtAllCost),
      },
      path: {
        name:              str(parsed?.path?.name),
        pathType:          str(parsed?.path?.pathType) || 'business',
        whyThisPath:       str(parsed?.path?.whyThisPath),
        whyNotAnotherPath: str(parsed?.path?.whyNotAnotherPath),
        marketFit:         str(parsed?.path?.marketFit),
        unfairAdvantage:   str(parsed?.path?.unfairAdvantage),
        realCost:          str(parsed?.path?.realCost),
      },
      thirtyDayMap: {
        week1_detective:   normalizeWeek(parsed?.thirtyDayMap?.week1_detective),
        week2_smallAsk:    normalizeWeek(parsed?.thirtyDayMap?.week2_smallAsk),
        week3_firstDollar: normalizeWeek(parsed?.thirtyDayMap?.week3_firstDollar),
        week4_scale:       normalizeWeek(parsed?.thirtyDayMap?.week4_scale),
      },
      scores: {
        overall:         clampScore(parsed?.scores?.overall),
        psychologyFit:   clampScore(parsed?.scores?.psychologyFit),
        marketViability: clampScore(parsed?.scores?.marketViability),
        executionFit:    clampScore(parsed?.scores?.executionFit),
        riskBalance:     clampScore(parsed?.scores?.riskBalance),
      },
      firstMilestone:   str(parsed?.firstMilestone),
      realisticRevenue: str(parsed?.realisticRevenue),
      // ── Mirror to matchResult for backward compat with Launch Package ──
      matchResult: {
        businessMatch:     str(parsed?.path?.name),
        whyMatch:          str(parsed?.path?.whyThisPath),
        marketOpportunity: str(parsed?.path?.marketFit),
        estimatedRevenue:  str(parsed?.realisticRevenue),
        unfairAdvantage:   str(parsed?.path?.unfairAdvantage),
        biggestRisk:       str(parsed?.profile?.avoidAtAllCost),
      },
      completedAt: new Date(),
      journeyStage: 'generated',
    };

    const dna = await BusinessDNA.findOneAndUpdate(
      { user: req.user._id },
      dnaDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, dna });
  } catch (err) {
    console.error('generateDNA error:', err);
    res.status(500).json({ error: 'Failed to generate psychological profile. Please try again.' });
  }
};

/* ── DELETE /api/business-dna/reset ───────────────────────────── */
exports.resetDNA = async (req, res) => {
  try {
    await BusinessDNA.deleteOne({ user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset' });
  }
};

/* ── PUT /api/business-dna/stage ───────────────────────────────
   Updates the user's journeyStage as they progress through the
   Launch Package (validated → branded → marketing → launched).
   Used by the Launch Package controller and the frontend. */
exports.updateStage = async (req, res) => {
  try {
    const validStages = ['pending','generated','validated','branded','marketing','launched'];
    const { stage } = req.body || {};
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }
    const dna = await BusinessDNA.findOneAndUpdate(
      { user: req.user._id },
      { journeyStage: stage },
      { new: true }
    );
    if (!dna) return res.status(404).json({ error: 'DNA not found' });
    res.json({ success: true, journeyStage: dna.journeyStage });
  } catch (err) {
    console.error('updateStage error:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  }
};

// ── Helpers ──
function str(v) { return v == null ? '' : String(v).trim(); }
function clampScore(n) { const x = Number(n); return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 0; }
function normalizeWeek(w) {
  if (!w || typeof w !== 'object') return { theme: '', actions: [], avoid: '', psychTrap: '' };
  return {
    theme:     str(w.theme),
    actions:   Array.isArray(w.actions) ? w.actions.slice(0, 8).map(s => str(s)).filter(Boolean) : [],
    avoid:     str(w.avoid),
    psychTrap: str(w.psychTrap),
  };
}

/* ══════════════════════════════════════════════════════════════════
   THE PROMPT — designed to make the model think like a psychologist
══════════════════════════════════════════════════════════════════ */
function buildArchitectPrompt({ userName, country, city, ctx, answers }) {
  return `You are about to do something most AI tools can't: actually SEE a person from the words they wrote.

A real human has answered 9 questions. They are trusting you to look beyond what they typed and tell them who they really are — what their psychology reveals, what hidden strengths they have, and the one path that fits them best.

═══════════════════════════════════════════════════════════
THE PERSON YOU ARE READING
═══════════════════════════════════════════════════════════
Name: ${userName}
Country: ${country || 'unknown'}
City: ${city || ctx.hub}
Currency for output: ${ctx.currency}

═══════════════════════════════════════════════════════════
THEIR 9 RAW ANSWERS (read these as a psychologist would)
═══════════════════════════════════════════════════════════

Q1 — Something you built, fixed, organized, or created that you're quietly proud of:
"${answers.proudOf}"

Q2 — When you feel most alive (talking to people all day vs solo deep work):
"${answers.energySource}"

Q3 — A product/service/habit in the world that's stupid and you could do better:
"${answers.couldDoBetter}"

Q4 — What friends, family, or coworkers keep coming to YOU for:
"${answers.peopleAskFor}"

Q5 — Work that drains the life out of you, even when you're good at it:
"${answers.whatYouHate}"

Q6 — What's actually stopping you from starting right now:
"${answers.whatStopsYou}"

Q7 — A normal Tuesday a year from now if everything goes right:
"${answers.successLooksLike}"

Q8 — What feels most natural to work with (people / products / content / systems / tech / hands / art / mix):
"${answers.naturalMedium}"

Q9 — Realistic budget for the next 90 days:
"${answers.budget}"

═══════════════════════════════════════════════════════════
HOW TO THINK (silently, before writing JSON)
═══════════════════════════════════════════════════════════

STEP 1 — READ THEIR PSYCHOLOGY, NOT THEIR RESUME
What does the THING they're proud of (Q1) reveal about how they work?
Did they build something alone? With others? Did they organize chaos? Did they fix something broken? Did they create something from nothing?
What does their pride reveal about what they value?

STEP 2 — DETECT WORK STYLE
Pick the ONE archetype that best fits their answers:
  • 🔍 The Detective  — observer, researcher, pattern-finder, quiet, deliberate
  • 🛠 The Builder    — maker, fixer, organizer, prefers tangible outcomes, solo-friendly
  • 🤝 The Connector  — relational, network-driven, energized by people, sales-natural
  • 🎭 The Performer  — stage-natural, content-driven, attention-comfortable, expressive
  • 🎨 The Maker      — craftsperson, aesthetic-driven, taste-led, slow + deep work
  • ⚙ The Operator   — systems-thinker, process-loving, runs things smoothly, reliable
  • 🤲 The Artisan    — hands-on, physical, traditional craft, in-person service
  • 🔀 The Hybrid     — clearly mixed — combines two archetypes meaningfully

STEP 3 — FIND THE HIDDEN STRENGTH
Their REAL strength is usually hidden in what they don't realize is valuable. Look at what people ask them for (Q4) — that's the strength they undervalue because it comes easy.

STEP 4 — DECODE WHAT REALLY DRIVES THEM
Read Q7 carefully. "Rich" means nothing. The detail in their Tuesday reveals everything: do they describe freedom? family? recognition? quiet? creativity? respect? Their real fuel lives in those details.

STEP 5 — DESIGN THE ROAD OF LEAST RESISTANCE
The path must:
- Match the work style you detected (NOT the industry they hint at)
- Use the energy source they described (Q2) — never recommend high-people-contact work to a solo-deep-work person
- AVOID the kind of work they hate (Q5) at all costs — even if it's profitable
- Fit the budget they actually have (Q9) — be honest if their dream needs more
- Live in their country if relevant, but DON'T let geography over-constrain — online/remote paths are valid if they fit psychology
- Address what's stopping them (Q6) — design around their real obstacle, don't pretend it doesn't exist

STEP 6 — REJECT GENERIC ANSWERS
Do NOT default to:
- "Digital marketing agency"
- "Generic ecommerce store"
- "Consulting firm"
- "SaaS startup"
unless their psychology EXPLICITLY fits and their answers prove they'd love that work.

The path you recommend could be:
- A specific business (most common)
- A creator/personal brand path
- A freelance career
- A hybrid (job + side business)
- A specialized service
- A physical product line
- An offline trade/craft
- An online + offline mix
Whatever ACTUALLY fits them. Don't force "business" if "creator" fits better.

═══════════════════════════════════════════════════════════
NOW WRITE THE OUTPUT
═══════════════════════════════════════════════════════════

Return ONLY valid JSON, no markdown, no backticks, no explanation. This exact shape:

{
  "profile": {
    "whoYouAre": "ONE devastating sentence using ${userName}'s name that reveals them to themselves. Should make them think 'how did this AI see that about me?'. Connect specific phrases from their answers. NOT generic. NOT flattering. Honest, almost uncomfortable, and clearly written about THEM. 2-3 sentences max.",
    "realStrength": "The strength hidden in their words — usually visible in what people ask them for (Q4) combined with what they're proud of (Q1). Explain WHY this is rare. 2-3 sentences. Name the strength specifically.",
    "workStyle": "One of: 🔍 The Detective | 🛠 The Builder | 🤝 The Connector | 🎭 The Performer | 🎨 The Maker | ⚙ The Operator | 🤲 The Artisan | 🔀 The Hybrid (Detective + Maker, etc.). Pick ONE — never multiple unless genuinely Hybrid.",
    "energyType": "Extrovert-fueled | Introvert-fueled | Mixed (with brief explanation of how their energy works — 1 sentence).",
    "motivationFuel": "What ACTUALLY drives them (decoded from Q7). 2-3 sentences. Name the real fuel — freedom, proving something, escape from ordinariness, family, respect, quiet, creativity, etc.",
    "riskDNA": "Their relationship with uncertainty — calculated, intuitive, fear-frozen, controlled, addicted to risk, etc. Read this from how they answered Q6 (what stops them). 2-3 sentences with how to build around it.",
    "avoidAtAllCost": "The specific KIND of work that would destroy them based on Q5 + Q2. Be specific — 'avoid sales-heavy work' or 'avoid solo isolated work' or 'avoid bureaucratic work'. 1-2 sentences."
  },
  "path": {
    "name": "The specific path — 6-12 words. Must be concrete and named. Examples: 'Premium handmade leather wallet brand for UAE professionals' or 'Specialized Arabic SEO consulting for Saudi e-commerce stores' or 'Boutique wedding styling service for Riyadh first-generation homeowners'. NEVER 'Digital marketing agency'. NEVER 'Ecommerce store'.",
    "pathType": "One of: business | freelance | hybrid | creator | service",
    "whyThisPath": "3-4 sentences. Connect specific phrases from their answers to specific reasons this path fits THEM. Quote 2-3 fragments from what they wrote. Make them feel this was written about them, not a generic template. Use ${userName}'s name once.",
    "whyNotAnotherPath": "2-3 sentences. Name the path they were PROBABLY considering (based on hints in their answers) and the honest reason it would have drained them. Reference Q2 or Q5 specifically.",
    "marketFit": "2-3 sentences on where this lives in ${country || 'their market'} in 2025. Include one concrete number, trend, or neighborhood/segment if you know one. Reference ${ctx.currency} for any prices.",
    "unfairAdvantage": "The unique combination of who they are + their location + the current timing that competitors can't copy. 2-3 sentences. Quote a phrase from their answers.",
    "realCost": "Honest truth about what this path will demand from them emotionally and practically. 2-3 sentences. Name the hardest part for THEIR specific psychology."
  },
  "thirtyDayMap": {
    "week1_detective": {
      "theme": "🔍 The Detective Phase — Listen, observe, research. Build nothing yet.",
      "actions": ["5 specific, doable actions for THIS person", "Named locations or platforms in ${country || 'their country'} when relevant", "Each action one sentence, concrete and measurable", "Reference their work style — a Detective gets research; a Connector gets conversations", "Each action specific enough they could do it today"],
      "avoid": "The specific mistake THIS personality is likely to make in Week 1.",
      "psychTrap": "The mental trap they'll hit this week — usually wanting to skip ahead to building. Name it specifically."
    },
    "week2_smallAsk": {
      "theme": "🤲 The Small Ask — Test if anyone will pay. Build nothing big yet.",
      "actions": ["5 specific actions to test demand cheaply", "Real platforms (Instagram DM, WhatsApp groups, specific marketplaces) in their country", "Pricing if relevant in ${ctx.currency}", "Match their work style — Connectors ask in person, Performers post content, Builders build a tiny prototype", "Each action concrete and doable in a week"],
      "avoid": "The week 2 trap for THIS personality.",
      "psychTrap": "The mental pitfall this week — usually fear of asking for money. Specific to them."
    },
    "week3_firstDollar": {
      "theme": "💵 The First Dollar — Money in account. Real validation, not theoretical.",
      "actions": ["5 actions to close their first paying customer", "Specific channels, scripts, platforms", "Pricing in ${ctx.currency}", "What to say, what to offer, what to deliver", "Each one a concrete, doable step"],
      "avoid": "The first-sale trap for THIS personality.",
      "psychTrap": "The mental pitfall — often underpricing or over-delivering. Specific to them."
    },
    "week4_scale": {
      "theme": "📈 The Scale Move — Turn what worked into a repeatable system.",
      "actions": ["5 actions to systematize and grow", "Real tools, automation, content cadence, referral mechanics", "Match their work style — a Maker scales through quality; a Connector through network; a Performer through content; a Builder through systems", "Each action specific and measurable", "Last action should set up Month 2"],
      "avoid": "The scaling trap for THIS personality.",
      "psychTrap": "The mental block at scale stage — usually 'I'm not ready' or 'I should perfect this first'. Specific to them."
    }
  },
  "scores": {
    "overall":         <0-100, weighted average>,
    "psychologyFit":   <0-100, how well this path matches their psychology>,
    "marketViability": <0-100, how real the market is in ${country || 'their region'}>,
    "executionFit":    <0-100, how ready they are based on their answers>,
    "riskBalance":     <0-100, how well this matches their risk DNA from Q6>
  },
  "firstMilestone":   "ONE measurable thing to achieve in 30 days. Specific number + ${ctx.currency} amount if relevant. Examples: '3 paying clients at SAR 800 each' or 'Pre-orders for 20 units at AED 250 each' or '500 qualified email signups + 5 sales calls booked'.",
  "realisticRevenue": "Honest Month 6 revenue range in ${ctx.currency} for this specific path with this budget. Show the math in one sentence (e.g. '12-20 customers/month × 350 SAR avg = 4,200-7,000 SAR/month')."
}`;
}
