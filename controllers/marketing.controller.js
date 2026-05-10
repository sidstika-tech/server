const Report = require('../models/report.model');
const User = require('../models/user.model');
const { generateMarketingStrategy } = require('../services/ai.service');
const { markdownToHTML } = require('../services/generator.service');

exports.buildStrategy = async (req, res) => {
  try {
    const { inputs } = req.body;
    if (!inputs || !inputs.businessName) return res.status(400).json({ error: 'Business name required' });

    const content = await generateMarketingStrategy(inputs);
    const title = `Marketing Strategy - ${inputs.businessName}`;
    const htmlContent = markdownToHTML(content, title);

    const report = await Report.create({
      user: req.user._id,
      title,
      type: 'marketing_strategy',
      content,
      htmlContent,
      inputs
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.marketingPlans': 1 } });

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMarketingReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, type: 'marketing_strategy' })
      .select('title createdAt')
      .sort('-createdAt');
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
