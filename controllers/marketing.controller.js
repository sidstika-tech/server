const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');

exports.build = async (req, res) => {
  try {
    const inputs = req.body.inputs || req.body;
    const { businessName } = inputs;
    if (!businessName) return res.status(400).json({ error: 'Business name is required' });

    const content = await aiService.generateMarketingStrategy(inputs);
    const title = `Marketing Strategy — ${businessName}`;

    const report = await Report.create({
      user: req.user._id, title, type: 'marketing_strategy', content, inputs
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1, 'usage.marketingPlans': 1 } });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, type: 'marketing_strategy' })
      .select('title type createdAt inputs').sort('-createdAt').limit(50);
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
