const BusinessDNA = require('../models/businessDNA.model');
const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');
const exportService = require('../services/export.service');

// The 8 documents in the Launch Package — in psychological order
// Order matters: validate first, then build, then market, then fund
const PACKAGE_ITEMS = [
  {
    id: 'market_research',
    label: 'Market Intelligence Report',
    icon: '◉',
    tagline: 'Know your battlefield before you enter',
    generate: (dna, ctx) => aiService.generateMarketResearch({
      niche: dna.industry,
      region: dna.country,
      product: dna.matchResult?.businessMatch,
      budget: dna.budget,
    })
  },
  {
    id: 'business_plan',
    label: 'Business Plan',
    icon: '📋',
    tagline: 'Your complete roadmap — investor ready',
    generate: (dna, ctx) => aiService.generateBusinessPlan({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      businessModel: 'As recommended by Business DNA analysis',
      targetMarket: `${dna.country} — ${dna.matchResult?.marketOpportunity?.slice(0,100) || 'MENA market'}`,
      location: `${dna.city || ''} ${dna.country}`.trim(),
      investment: dna.budget,
      goals: dna.goal,
    })
  },
  {
    id: 'brand_kit',
    label: 'Brand Identity Kit',
    icon: '🎨',
    tagline: 'The face of your business — built to be remembered',
    generate: (dna, ctx) => aiService.generateBrandKit({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      values: 'Trust, Excellence, Innovation',
      targetAudience: `${dna.country} market — ${dna.industry} customers`,
      style: 'Modern, Professional, Trustworthy',
    })
  },
  {
    id: 'competitor_matrix',
    label: 'Competitor Analysis',
    icon: '⚔',
    tagline: 'Know your enemies better than they know themselves',
    generate: (dna, ctx) => aiService.generateCompetitorMatrix({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      region: dna.country,
      uniqueAngle: dna.matchResult?.unfairAdvantage || dna.skills,
    })
  },
  {
    id: 'pricing_calculator',
    label: 'Pricing Strategy',
    icon: '💰',
    tagline: 'Price too low and you die slowly. Price right and you win.',
    generate: (dna, ctx) => aiService.generatePricingCalculator({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      product: dna.industry,
      industry: dna.industry,
      monthlyCosts: 'Based on budget: ' + dna.budget,
      targetMargin: '40-60%',
      competitorPricing: `Market rate in ${dna.country}`,
    })
  },
  {
    id: 'marketing_strategy',
    label: 'Marketing Strategy',
    icon: '◈',
    tagline: 'Your complete plan to get and keep customers',
    generate: (dna, ctx) => aiService.generateMarketingStrategy({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      targetAudience: `${dna.country} ${dna.industry} customers`,
      goals: dna.goal,
      budget: dna.budget,
      currentPresence: 'Starting fresh',
      timeline: '6 months',
    })
  },
  {
    id: 'launch_roadmap',
    label: '30-Day Launch Roadmap',
    icon: '🚀',
    tagline: 'Day by day. No guessing. Just execute.',
    generate: (dna, ctx) => aiService.generateLaunchRoadmap({
      businessName: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      budget: dna.budget,
      teamSize: 'Solo founder or small team',
      currentStatus: 'Pre-launch — DNA analysis complete',
      goal: dna.goal,
    })
  },
  {
    id: 'budget_estimator',
    label: '6-Month Financial Model',
    icon: '💵',
    tagline: 'Your numbers. Your runway. Your survival plan.',
    generate: (dna, ctx) => aiService.generateBudgetEstimator({
      businessType: dna.matchResult?.businessMatch || dna.industry,
      industry: dna.industry,
      location: `${dna.city || ''} ${dna.country}`.trim(),
      teamSize: 'Founder + 1-2',
      revenueModel: 'To be defined based on business match',
      targetRevenue: dna.matchResult?.estimatedRevenue || 'First profitable month',
    })
  },
];

// GET — check if package exists
exports.getPackage = async (req, res) => {
  try {
    const dna = await BusinessDNA.findOne({ user: req.user._id });
    if (!dna?.matchResult?.businessMatch) {
      return res.status(400).json({ error: 'Complete your Business DNA first' });
    }
    // Find existing package reports
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

// POST — generate one specific item in the package
exports.generateItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = PACKAGE_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(400).json({ error: 'Unknown package item' });

    const dna = await BusinessDNA.findOne({ user: req.user._id });
    if (!dna?.matchResult?.businessMatch) {
      return res.status(400).json({ error: 'Complete your Business DNA first' });
    }

    // Delete old version if exists
    await Report.deleteOne({
      user: req.user._id,
      type: itemId,
      'inputs.fromPackage': true
    });

    const content = await item.generate(dna);
    const title = `${item.label} — ${dna.matchResult.businessMatch}`;
    const htmlContent = exportService.generateHTML ? exportService.generateHTML(title, content) : content;

    const report = await Report.create({
      user: req.user._id,
      title,
      type: itemId,
      content,
      htmlContent,
      inputs: {
        fromPackage: true,
        businessMatch: dna.matchResult.businessMatch,
        country: dna.country,
        industry: dna.industry,
      }
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1 } });

    // Update journey stage
    const stageMap = {
      market_research: 'validated',
      brand_kit: 'branded',
      marketing_strategy: 'marketing',
      launch_roadmap: 'marketing',
    };
    if (stageMap[itemId]) {
      await BusinessDNA.findOneAndUpdate(
        { user: req.user._id },
        { journeyStage: stageMap[itemId] }
      );
    }

    res.json({ success: true, report: { _id: report._id, title, type: itemId } });
  } catch (err) {
    console.error('Package generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST — generate ALL items sequentially (called one at a time from frontend)
exports.generateAll = async (req, res) => {
  // This just returns the ordered list — frontend generates one by one
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
