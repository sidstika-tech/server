const BusinessDNA = require('../models/businessDNA.model');
const { openrouterChat } = require('../services/gemini.service');

/* ══════════════════════════════════════════════════════════════════
   BUSINESS DNA — PSYCHOLOGICAL ARCHITECT & TALENT HUNTER

   This is NOT a business idea generator.
   This is NOT a country-market matcher.
   This is a psychologist who:

   ✦ Reads WHO the user is between the lines of their 9 answers
   ✦ Finds hidden strengths they don't see in themselves
   ✦ Detects work style + motivation fuel + risk DNA
   ✦ Designs the Road of Least Resistance — psychology FIRST, market SECOND
   ✦ Builds a 30-day failure-proof map shaped by THEIR personality

   CRITICAL RULES:
   — The model does NOT recommend a business because of the user's country.
   — Country is used ONLY for currency and local platform references.
   — The path comes from PSYCHOLOGY. Geography is context, not driver.
   — The model does NOT choose a business for the user. It reads the user
     and reveals the path that already exists in their answers.
   — No flattery. No generic advice. No Silicon Valley templates.
══════════════════════════════════════════════════════════════════ */

const COUNTRY_CONTEXT = {
  'Saudi Arabia': { currency: 'SAR', hub: 'Riyadh' },
  'UAE':          { currency: 'AED', hub: 'Dubai' },
  'Egypt':        { currency: 'EGP', hub: 'Cairo' },
  'Qatar':        { currency: 'QAR', hub: 'Doha' },
  'Kuwait':       { currency: 'KWD', hub: 'Kuwait City' },
  'Bahrain':      { currency: 'BHD', hub: 'Manama' },
  'Oman':         { currency: 'OMR', hub: 'Muscat' },
  'Jordan':       { currency: 'JOD', hub: 'Amman' },
  'Morocco':      { currency: 'MAD', hub: 'Casablanca' },
  'Lebanon':      { currency: 'LBP', hub: 'Beirut' },
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

    const required = ['proudOf', 'energySource', 'couldDoBetter', 'peopleAskFor', 'whatYouHate', 'whatStopsYou', 'successLooksLike', 'naturalMedium', 'budget'];
    for (const k of required) {
      if (!a[k] || String(a[k]).trim().length < 3) {
        return res.status(400).json({ error: `Please answer all 9 questions. Missing or too short: ${k}` });
      }
    }

    const ctx = ctxFor(country);
    const prompt = buildArchitectPrompt({ userName, country, city, ctx, answers: a });

    const raw = await openrouterChat(
      prompt,
      `You are a Psychological Architect & Talent Hunter. Your job is NOT to suggest business ideas based on where someone lives. Your job is to read who they are. You detect patterns in how people describe their proudest moments, what drains them, what people ask from them, what they imagine their future looks like. From these signals, you reveal the path that is already embedded in their psychology. You write like a wise older sibling who has watched them quietly and finally speaks the truth. You never flatter. You never give generic answers. You output valid JSON only.`,
      {
        temperature: 0.9,
        topP: 0.95,
        json: true,
        language,
        model: 'anthropic/claude-3-5-haiku',
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

/* ── PUT /api/business-dna/stage ───────────────────────────────── */
exports.updateStage = async (req, res) => {
  try {
    const validStages = ['pending', 'generated', 'validated', 'branded', 'marketing', 'launched'];
    const { stage } = req.body || {};
    if (!validStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
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
   THE PROMPT — The Psychological Architect

   DESIGN PHILOSOPHY:
   The model must read the USER, not scan the country.
   The path emerges from psychology patterns in 9 answers.
   Country is used ONLY for currency + platform context.
   The model reveals what's already in the person.
══════════════════════════════════════════════════════════════════ */
function buildArchitectPrompt({ userName, country, city, ctx, answers }) {
  return `You are about to do something most AI systems cannot: actually SEE a person from the words they wrote.

A real human has answered 9 questions honestly. They are trusting you to look beyond the surface and tell them who they really are — what patterns their psychology reveals, what hidden strengths live in their words, and the one path that fits THEM.

NOT the path that's popular in their country.
NOT the path that's trending on LinkedIn.
NOT the path you'd give to a generic founder.

The path embedded in THEIR answers.

═══════════════════════════════════════════════════════════
THE PERSON YOU ARE READING
═══════════════════════════════════════════════════════════
Name: ${userName}
Location: ${city || ctx.hub}, ${country || 'MENA'}
Currency for output: ${ctx.currency}

IMPORTANT: Location is NOT the driver of your recommendation.
You use location ONLY for:
- Naming local platforms or apps in the 30-day map (e.g., Instagram, WhatsApp, Jahez, Talabat)
- Currency in financial estimates
- One sentence of market context if relevant

The PATH comes from psychology. Not geography.

═══════════════════════════════════════════════════════════
THEIR 9 RAW ANSWERS
Read these the way a psychologist would — not a career counselor.
What do the WORDS reveal about how this person thinks?
What is UNDERNEATH what they typed?
═══════════════════════════════════════════════════════════

Q1 — Something you built, fixed, organized, or created that you're quietly proud of:
"${answers.proudOf}"

Q2 — When you feel most alive (talking to people all day vs solo deep work, or mix):
"${answers.energySource}"

Q3 — A product, service, or habit in the world that's stupid — and you could do better:
"${answers.couldDoBetter}"

Q4 — What friends, family, or coworkers keep coming to YOU for (what you're the person for):
"${answers.peopleAskFor}"

Q5 — Work that drains the life out of you, even when you're technically good at it:
"${answers.whatYouHate}"

Q6 — What's ACTUALLY stopping you from starting right now (honest, not the PR version):
"${answers.whatStopsYou}"

Q7 — Describe a normal Tuesday a year from now if everything goes right:
"${answers.successLooksLike}"

Q8 — What medium feels most natural to work with (people / products / content / systems / tech / hands / art / mix):
"${answers.naturalMedium}"

Q9 — Realistic budget for the next 90 days:
"${answers.budget}"

═══════════════════════════════════════════════════════════
HOW TO THINK — YOUR READING PROCESS
(Do this silently before writing JSON)
═══════════════════════════════════════════════════════════

STEP 1 — READ THE PRIDE SIGNAL (Q1)
What does the thing they're proud of reveal?
Did they build alone or with others?
Did they organize existing chaos or create something new?
Did they fix a broken system or make something beautiful?
Their pride object reveals their deepest competence — the thing they do without being asked.

STEP 2 — DETECT THE WORK STYLE ARCHETYPE
Pick ONE that fits their answers as a whole:

  🔍 The Detective   — observer, researcher, pattern-finder. Works best alone with information. Energized by figuring things out. Drained by performance and small talk.
  🛠 The Builder     — maker, fixer, organizer. Loves creating tangible results. Prefers solo or small team. Drained by politics and ambiguity.
  🤝 The Connector   — relational, network-driven. Energized by people and conversation. Naturally sells. Drained by isolation and solo deep work.
  🎭 The Performer   — stage-comfortable, content-driven, expressive. Attention doesn't scare them. Drained by invisible behind-the-scenes work.
  🎨 The Maker       — craftsperson, aesthetic-driven, taste-led. Mastery and quality matter more than speed. Drained by factory-like repetition.
  ⚙ The Operator    — systems-thinker, process-lover. Builds things that run without them. Drained by chaos and undefined roles.
  🤲 The Artisan     — hands-on, physical, in-person service. Mastery through touch and direct delivery. Drained by screens and remote work.
  🔀 The Hybrid      — genuinely combines two archetypes (name both, e.g. "Detective + Maker")

STEP 3 — FIND THE HIDDEN STRENGTH
Look at Q4 (what people ask them for) + Q1 (what they built).
The overlap reveals a strength they undervalue because it comes naturally.
This is usually the most commercially valuable thing about them.
Name it specifically. Don't be vague.

STEP 4 — DECODE THE REAL MOTIVATION (Q7)
Ignore what they SAID they want. Read the DETAILS.
If they describe family peace → security is the real driver
If they describe a specific daily scene → autonomy is the real driver
If they describe recognition or respect → status is the real driver
If they describe creating → expression is the real driver
The detail in their Tuesday reveals their soul's actual fuel.

STEP 5 — UNDERSTAND WHAT'S REALLY BLOCKING THEM (Q6)
Most people give the "acceptable" answer (money, time). Read what's underneath.
Fear of judgment? Fear of failure with witnesses? Fear of leaving security?
Name the actual psychological block — not the surface excuse.
Design the 30-day map to route AROUND this block, not through it.

STEP 6 — DESIGN THE ROAD OF LEAST RESISTANCE
The path must:
✓ Match their work style archetype (Q2 + Q8)
✓ Use the energy source they described — never give people-heavy work to a solo-deep-worker
✓ AVOID the drain zone they named (Q5) — even if it's profitable
✓ Be realistic for their budget (Q9)
✓ Address the real block from Q6 — not pretend it doesn't exist
✓ Leverage what people already come to them for (Q4) — that's proven demand

The path can be:
- A specific service business
- A creator/personal brand path
- A product-based business
- A freelance career
- A hybrid (side business + income)
- A specialist consultancy
- A physical craft or trade
- An online community or platform

Whatever actually fits. Don't default to "digital marketing agency."

STEP 7 — WRITE AS IF YOU KNOW THEM
Use ${userName}'s name once or twice in the output.
Quote specific fragments from their answers (max 3-4 words, not full sentences) to show you read THEM.
The best output makes them feel: "How did it see that about me?"

═══════════════════════════════════════════════════════════
JSON OUTPUT — Return this exact shape. No markdown. No explanation.
═══════════════════════════════════════════════════════════

{
  "profile": {
    "whoYouAre": "2-3 sentences. Uses ${userName}'s name. Connects specific fragments from their actual answers to reveal their psychological pattern. Should feel almost uncomfortably accurate — like someone who watched them quietly for months finally speaking. NOT a compliment. A revelation.",
    "realStrength": "The strength hidden in their words — the overlap between what people ask them for (Q4) and what they built (Q1). Explain WHY this is rare and commercially valuable. 2-3 sentences. Name the specific skill, NOT just the category.",
    "workStyle": "One of the 8 archetypes — pick the ONE best fit. Format: 🔍 The Detective (or whichever). Include one sentence explaining which specific answers led to this.",
    "energyType": "Extrovert-fueled | Introvert-fueled | Mixed — plus one sentence on how their specific energy works based on Q2.",
    "motivationFuel": "What ACTUALLY drives them — decoded from the details in Q7, not the surface answer. Name the real fuel: security, autonomy, status, expression, belonging, proving something. 2-3 sentences. Reference a specific detail from their Q7 answer.",
    "riskDNA": "Their relationship with uncertainty — read from Q6. Are they fear-frozen? Calculated? Intuition-driven? Addicted to risk? 2-3 sentences. Include how to design around this risk profile, not fight it.",
    "avoidAtAllCost": "The specific KIND of work that would silently destroy them — from Q5 + Q2. Be specific: 'avoid high-volume sales calls', 'avoid repetitive execution work', 'avoid being the public face'. 1-2 sentences."
  },
  "path": {
    "name": "6-12 words. Concrete and specific. Examples: 'Premium Arabic content strategy for Gulf e-commerce brands' or 'Boutique interior photography service for Riyadh real estate developers' or 'Specialized Arabic UX writing for fintech apps'. NEVER: 'Digital marketing agency'. NEVER: 'E-commerce store'. NEVER: 'Consulting firm'. The path must be specific enough that someone reading it could Google competitors.",
    "pathType": "One of: business | freelance | hybrid | creator | service",
    "whyThisPath": "3-4 sentences. Connect specific phrases from their actual answers to specific reasons this path fits THEIR psychology. Reference their work style, their energy type, and their real motivation. Quote 2-3 short fragments from their answers (max 4 words each). Use ${userName}'s name once. The reader should feel: 'yes, this was written about me specifically.'",
    "whyNotAnotherPath": "2-3 sentences. Name the path they were PROBABLY considering based on hints in their answers. Explain the specific psychological reason it would have drained them within 6 months. Reference Q2 or Q5 specifically.",
    "marketFit": "2-3 sentences of market context. Reference the ${country || 'MENA'} market specifically if relevant. Include ONE concrete number, trend, or specific customer segment if you can name one honestly. Use ${ctx.currency} for any price references. NOTE: This section is context, not the reason for the path. The path came from their psychology.",
    "unfairAdvantage": "The specific combination of who they are + the evidence in their answers that competitors cannot replicate. 2-3 sentences. Quote a short fragment from their answers. Connect their background, personality, and natural medium to why they have an edge.",
    "realCost": "Honest truth about what this path will demand emotionally and practically. 2-3 sentences. Name the hardest part for THEIR specific psychology — the thing they'll want to quit when it gets hard. Don't soften it."
  },
  "thirtyDayMap": {
    "week1_detective": {
      "theme": "🔍 The Detective Phase — Observe. Listen. Research. Build nothing yet.",
      "actions": [
        "Action 1 — specific, doable today. Platform or location in ${city || ctx.hub} if relevant. Measurable outcome.",
        "Action 2 — tailored to their work style (Detective gets research; Connector gets conversations; Performer creates content; Builder prototypes)",
        "Action 3 — addresses their specific block from Q6 in a low-risk way",
        "Action 4 — leverages what people already come to them for (Q4)",
        "Action 5 — ends with something they can show or report back on"
      ],
      "avoid": "The specific mistake THIS personality type makes in Week 1 (usually overthinking, over-researching, or spending money before validating).",
      "psychTrap": "The mental spiral this person specifically will hit in Week 1. Name it precisely based on their Q6 answer."
    },
    "week2_smallAsk": {
      "theme": "🤲 The Small Ask — Test if anyone will pay. Build nothing big yet.",
      "actions": [
        "Action 1 — test demand with zero build. Use WhatsApp, Instagram DM, or a specific local platform.",
        "Action 2 — specific script or offer to test. Match their work style (Connector asks in person; Performer posts content; Builder builds a minimum prototype)",
        "Action 3 — price test in ${ctx.currency}. One specific number to test.",
        "Action 4 — collect feedback in a structured way",
        "Action 5 — decision point: what they'll know by end of week 2"
      ],
      "avoid": "The Week 2 trap for THIS personality.",
      "psychTrap": "The fear of asking for money specific to their psychology (usually underpricing or avoiding the ask entirely)."
    },
    "week3_firstDollar": {
      "theme": "💵 The First Dollar — Money in. Real validation. Not theoretical.",
      "actions": [
        "Action 1 — the specific offer to close. Price in ${ctx.currency}.",
        "Action 2 — the specific channel to use for this first sale",
        "Action 3 — what to say in the pitch (2-3 sentences, specific to their product)",
        "Action 4 — what to deliver to the first customer",
        "Action 5 — how to get a testimonial or referral from first customer"
      ],
      "avoid": "The first-sale self-sabotage this personality type typically does.",
      "psychTrap": "The mental block at first payment — often underpricing, over-delivering, or stalling with perfectionism."
    },
    "week4_scale": {
      "theme": "📈 The Scale Move — Turn what worked into a repeatable system.",
      "actions": [
        "Action 1 — document the process that worked in Week 3",
        "Action 2 — automate or systematize one step (tool, template, or script)",
        "Action 3 — reach 3-5 more potential customers using the same approach",
        "Action 4 — set up one recurring revenue mechanism (retainer, package, subscription)",
        "Action 5 — define Month 2 target: specific number of clients + ${ctx.currency} amount"
      ],
      "avoid": "The scale trap for THIS personality — usually expanding too fast (Performers) or perfectionism paralysis (Detectives/Makers).",
      "psychTrap": "The 'not ready yet' pattern specific to their psychology. Name the exact voice they'll hear in their head."
    }
  },
  "scores": {
    "overall":         "<0-100 — weighted average of all four>",
    "psychologyFit":   "<0-100 — how deeply this path matches their detected psychology>",
    "marketViability": "<0-100 — honest assessment of the path's market in ${country || 'MENA'}>",
    "executionFit":    "<0-100 — how ready they are based on their answers, budget, and block>",
    "riskBalance":     "<0-100 — how well this path matches their risk DNA from Q6>"
  },
  "firstMilestone": "ONE measurable 30-day target. Specific number + ${ctx.currency} if relevant. Examples: '3 paid clients at ${ctx.currency} 800 each' or 'Pre-orders from 20 people at ${ctx.currency} 250 each' or '500 email signups + 5 sales calls booked'.",
  "realisticRevenue": "Honest Month 6 range in ${ctx.currency}. Show the math: 'X clients/month × Y ${ctx.currency} avg = Z-W ${ctx.currency}/month'. Base on their budget (${answers.budget}) and path type."
}`;
}
