const BusinessDNA = require('../models/businessDNA.model');
const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');
const exportService = require('../services/export.service');

// The 8 documents in the Launch Package — each shaped by the user's psychology
// Order matters: validate first, then build, then market, then fund
//
// Every generator receives the FULL psychological profile so documents feel
// coherent — written for THIS person, not a generic founder.
function profileContext(dna) {
  const p = dna.profile || {};
  const path = dna.path || {};
  return {
    psychWhoYouAre:   p.whoYouAre || '',
    psychStrength:    p.realStrength || '',
    psychWorkStyle:   p.workStyle || '',
    psychEnergy:      p.energyType || '',
    psychMotivation:  p.motivationFuel || '',
    psychRiskDNA:     p.riskDNA || '',
    psychAvoid:       p.avoidAtAllCost || '',
    pathName:         path.name || dna.matchResult?.businessMatch || '',
    pathWhy:          path.whyThisPath || '',
    pathUnfair:       path.unfairAdvantage || '',
    pathMarketFit:    path.marketFit || '',
    pathRealCost:     path.realCost || '',
  };
}

const PACKAGE_ITEMS = [
  {
    id: 'market_research',
    label: 'Market Intelligence Report',
    icon: '◉',
    tagline: 'Know your battlefield before you enter',
    generate: (dna, lang) => aiService.generateMarketResearch({
      niche: dna.path?.name || dna.matchResult?.businessMatch || '',
      region: dna.country,
      product: dna.path?.name || dna.matchResult?.businessMatch,
      budget: dna.answers?.budget || '',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'business_plan',
    label: 'Business Plan',
    icon: '📋',
    tagline: 'Your complete roadmap — built around YOUR psychology',
    generate: (dna, lang) => aiService.generateBusinessPlan({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      businessModel: 'Designed around the founder\'s psychology: ' + (dna.profile?.workStyle || ''),
      targetMarket: `${dna.country} — ${dna.path?.marketFit?.slice(0,120) || 'MENA market'}`,
      location: `${dna.city || ''} ${dna.country}`.trim(),
      investment: dna.answers?.budget || '',
      goals: dna.answers?.successLooksLike || '',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'brand_kit',
    label: 'Brand Identity Kit',
    icon: '🎨',
    tagline: 'A brand that sounds like you — not like everyone else',
    generate: (dna, lang) => aiService.generateBrandKit({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      values: dna.profile?.motivationFuel || 'Trust, Excellence, Innovation',
      targetAudience: `${dna.country} — buyers of: ${dna.path?.name || ''}`,
      style: dna.profile?.workStyle || 'Modern, Professional, Trustworthy',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'competitor_matrix',
    label: 'Competitor Analysis',
    icon: '⚔',
    tagline: 'Know your enemies — and where they cannot follow you',
    generate: (dna, lang) => aiService.generateCompetitorMatrix({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      region: dna.country,
      uniqueAngle: dna.path?.unfairAdvantage || dna.profile?.realStrength || '',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'pricing_calculator',
    label: 'Pricing Strategy',
    icon: '💰',
    tagline: 'Price like the position you want — not the one you have',
    generate: (dna, lang) => aiService.generatePricingCalculator({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      product: dna.path?.name || '',
      industry: dna.path?.name || '',
      monthlyCosts: 'Based on budget: ' + (dna.answers?.budget || ''),
      targetMargin: '40-60%',
      competitorPricing: `Market rate in ${dna.country}`,
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'marketing_strategy',
    label: 'Marketing Strategy',
    icon: '◈',
    tagline: 'Acquire customers the way YOU naturally would',
    generate: (dna, lang) => aiService.generateMarketingStrategy({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      targetAudience: `${dna.country} — buyers for: ${dna.path?.name || ''}`,
      goals: dna.answers?.successLooksLike || '',
      budget: dna.answers?.budget || '',
      currentPresence: 'Starting fresh',
      timeline: '6 months',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'launch_roadmap',
    label: '30-Day Launch Roadmap',
    icon: '🚀',
    tagline: 'Day by day — paced for your work style',
    generate: (dna, lang) => aiService.generateLaunchRoadmap({
      businessName: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      budget: dna.answers?.budget || '',
      teamSize: 'Solo founder or small team',
      currentStatus: 'Pre-launch — DNA analysis complete',
      goal: dna.answers?.successLooksLike || '',
      language: lang,
      ...profileContext(dna),
    })
  },
  {
    id: 'budget_estimator',
    label: '6-Month Financial Model',
    icon: '💵',
    tagline: 'Your numbers, your runway, your honest plan',
    generate: (dna, lang) => aiService.generateBudgetEstimator({
      businessType: dna.path?.name || dna.matchResult?.businessMatch || '',
      industry: dna.path?.name || '',
      location: `${dna.city || ''} ${dna.country}`.trim(),
      teamSize: 'Founder + 1-2',
      revenueModel: 'To be defined based on path: ' + (dna.path?.pathType || 'business'),
      targetRevenue: dna.realisticRevenue || 'First profitable month',
      language: lang,
      ...profileContext(dna),
    })
  },
];

/* ══════════════════════════════════════════════════════════════════
   BACKGROUND JOB TRACKING
   Tracked in-memory per user. The frontend polls `/api/launch-package/status`
   to know what's been generated. Generation continues even if the user
   closes the tab — the loop runs server-side without an HTTP response.
══════════════════════════════════════════════════════════════════ */
const activeJobs = new Map(); // userId -> { status, currentIndex, total, error, lang, startedAt }

function getJob(userId) {
  return activeJobs.get(String(userId)) || null;
}

function setJob(userId, job) {
  activeJobs.set(String(userId), job);
}

function clearJob(userId) {
  activeJobs.delete(String(userId));
}

// ── GET — check package state + any active job ─────────────────────
exports.getPackage = async (req, res) => {
  try {
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    if (!dna?.matchResult?.businessMatch) {
      return res.status(400).json({ error: 'Complete your Business DNA first' });
    }
    const reports = await Report.find({
      user: req.user._id,
      type: { $in: PACKAGE_ITEMS.map(i => i.id) },
      'inputs.fromPackage': true
    }).select('type title createdAt').sort('createdAt');

    const packageMap = {};
    reports.forEach(r => { packageMap[r.type] = r; });

    res.json({
      success: true,
      dna,
      job: getJob(req.user._id),
      items: PACKAGE_ITEMS.map(item => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        tagline: item.tagline,
        status: packageMap[item.id] ? 'done' : 'pending',
        reportId: packageMap[item.id]?._id || null,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET — lightweight poll endpoint for the active job ────────────
exports.getStatus = async (req, res) => {
  try {
    const job = getJob(req.user._id);

    // Always return current completed reports so frontend can update cards in real time
    const reports = await Report.find({
      user: req.user._id,
      type: { $in: PACKAGE_ITEMS.map(i => i.id) },
      'inputs.fromPackage': true
    }).select('type _id createdAt');

    const completedTypes = reports.map(r => r.type);

    res.json({ success: true, job, completedTypes, completedCount: completedTypes.length, total: PACKAGE_ITEMS.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── INTERNAL — generate one item (returns the saved report) ───────
async function generateOneItem(userId, dna, itemId, lang) {
  const item = PACKAGE_ITEMS.find(i => i.id === itemId);
  if (!item) throw new Error('Unknown package item: ' + itemId);

  // Delete old package version if exists
  await Report.deleteOne({ user: userId, type: itemId, 'inputs.fromPackage': true });

  const content = await item.generate(dna, lang);
  const title = `${item.label} — ${dna.matchResult.businessMatch}`;
  const htmlContent = exportService.generateHTML ? exportService.generateHTML(title, content) : content;

  const report = await Report.create({
    user: userId,
    title, type: itemId, content, htmlContent,
    inputs: {
      fromPackage: true,
      businessMatch: dna.matchResult.businessMatch,
      country: dna.country,
      industry: dna.industry,
      language: lang,
    }
  });

  await User.findByIdAndUpdate(userId, { $inc: { 'usage.reportsGenerated': 1 } });

  const stageMap = {
    market_research: 'validated',
    brand_kit: 'branded',
    marketing_strategy: 'marketing',
    launch_roadmap: 'marketing',
  };
  if (stageMap[itemId]) {
    await BusinessDNA.findOneAndUpdate({ user: userId }, { journeyStage: stageMap[itemId] });
  }

  return report;
}

// ── POST — generate a SINGLE item (synchronous, returns the report) ─
exports.generateItem = async (req, res) => {
  try {
    const { itemId, language } = req.body;
    const item = PACKAGE_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(400).json({ error: 'Unknown package item' });

    const dna = await BusinessDNA.findOne({ user: req.user._id });
    if (!dna?.matchResult?.businessMatch) {
      return res.status(400).json({ error: 'Complete your Business DNA first' });
    }

    const lang = language === 'ar' ? 'ar' : 'en';
    const report = await generateOneItem(req.user._id, dna, itemId, lang);
    res.json({ success: true, report: { _id: report._id, title: report.title, type: itemId } });
  } catch (err) {
    console.error('Package single-item generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   POST — GENERATE ALL (BACKGROUND)
   Responds immediately with "job started". Continues generating
   even if the user closes the tab. The frontend polls /status to
   see progress. If a job is already running, refuses to start another.
══════════════════════════════════════════════════════════════════ */
exports.generateAllBackground = async (req, res) => {
  try {
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    if (!dna?.matchResult?.businessMatch) {
      return res.status(400).json({ error: 'Complete your Business DNA first' });
    }

    const userId = String(req.user._id);
    const existing = getJob(userId);
    if (existing && existing.status === 'running') {
      return res.json({ success: true, alreadyRunning: true, job: existing });
    }

    const lang = req.body.language === 'ar' ? 'ar' : 'en';

    // Pre-fetch the already-done items so we don't redo them
    const doneReports = await Report.find({
      user: userId,
      type: { $in: PACKAGE_ITEMS.map(i => i.id) },
      'inputs.fromPackage': true
    }).select('type');
    const doneIds = new Set(doneReports.map(r => r.type));
    const pending = PACKAGE_ITEMS.filter(i => !doneIds.has(i.id));

    // Create job record
    const job = {
      status: 'running',
      currentIndex: 0,
      total: pending.length,
      currentItemId: pending[0]?.id || null,
      currentLabel: pending[0]?.label || null,
      lang,
      startedAt: new Date(),
      error: null,
    };
    setJob(userId, job);

    // Respond immediately — DO NOT await the loop
    res.json({ success: true, job, pendingCount: pending.length });

    // ── BACKGROUND LOOP ──
    // Note: this runs AFTER the response is sent. On Vercel serverless,
    // the function instance must stay alive for the duration — which it does
    // for the standard ~5-minute timeout window. For long-running jobs,
    // each item is independent so even if the function dies, the user can
    // re-trigger and only missing items will run.
    (async () => {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        try {
          // Update job state for poller
          const j = getJob(userId);
          if (!j || j.status === 'cancelled') return;
          j.currentIndex = i;
          j.currentItemId = item.id;
          j.currentLabel = item.label;
          setJob(userId, j);

          await generateOneItem(userId, dna, item.id, lang);

          // Brief pause between items to be kind to Gemini quotas
          if (i < pending.length - 1) await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          console.error(`Background gen failed for ${item.id}:`, err.message);
          const j = getJob(userId);
          if (j) {
            j.error = `${item.label}: ${err.message}`;
            setJob(userId, j);
          }
          // Continue with next item even if one fails
        }
      }
      const finalJob = getJob(userId);
      if (finalJob) {
        finalJob.status = 'completed';
        finalJob.currentItemId = null;
        finalJob.currentLabel = null;
        finalJob.finishedAt = new Date();
        setJob(userId, finalJob);
      }
      // Auto-cleanup after 5 minutes so the job map doesn't grow unbounded
      setTimeout(() => clearJob(userId), 5 * 60 * 1000);
    })().catch(err => {
      console.error('Background job uncaught error:', err);
      const j = getJob(userId);
      if (j) { j.status = 'failed'; j.error = err.message; setJob(userId, j); }
    });
  } catch (err) {
    console.error('generateAllBackground error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST — cancel a running job ──────────────────────────────────
exports.cancelJob = async (req, res) => {
  const job = getJob(req.user._id);
  if (!job) return res.json({ success: true, message: 'No active job' });
  job.status = 'cancelled';
  setJob(req.user._id, job);
  res.json({ success: true });
};

// Legacy endpoint kept for compatibility
exports.generateAll = async (req, res) => {
  const dna = await BusinessDNA.findOne({ user: req.user._id });
  if (!dna?.matchResult?.businessMatch) {
    return res.status(400).json({ error: 'Complete your Business DNA first' });
  }
  res.json({
    success: true,
    order: PACKAGE_ITEMS.map(i => i.id),
    businessMatch: dna.matchResult.businessMatch,
    country: dna.country,
  });
};
