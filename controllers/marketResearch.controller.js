const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');

exports.analyze = async (req, res) => {
  try {
    const inputs = aiService.sanitizeInputs(req.body.inputs || req.body);
    const { niche } = inputs;
    if (!niche) return res.status(400).json({ error: 'Niche/industry is required' });

    const content = await aiService.generateMarketResearch(inputs);
    const title = `Market Research — ${niche}`;

    const report = await Report.create({
      user: req.user._id, title, type: 'market_research', content, inputs,
    });
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'usage.reportsGenerated': 1, 'usage.marketResearch': 1 },
    });
    res.json({ success: true, report });
  } catch (err) {
    console.error('marketResearch.analyze error:', err);
    res.status(500).json({ error: 'Research generation failed. Please try again.' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, type: 'market_research' })
      .select('title type createdAt inputs').sort('-createdAt').limit(50);
    res.json({ success: true, reports });
  } catch (err) {
    console.error('marketResearch.getReports error:', err);
    res.status(500).json({ error: 'Failed to load reports.' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('marketResearch.deleteReport error:', err);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
};
