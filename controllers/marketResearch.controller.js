const Report = require('../models/report.model');
const User = require('../models/user.model');
const { generateMarketResearch } = require('../services/ai.service');
const { markdownToHTML } = require('../services/generator.service');

exports.research = async (req, res) => {
  try {
    const { inputs } = req.body;
    if (!inputs || !inputs.niche) return res.status(400).json({ error: 'Niche/industry required' });

    const content = await generateMarketResearch(inputs);
    const title = `Market Research - ${inputs.niche}`;
    const htmlContent = markdownToHTML(content, title);

    const report = await Report.create({
      user: req.user._id,
      title,
      type: 'market_research',
      content,
      htmlContent,
      inputs
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.marketResearch': 1 } });

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getResearchReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, type: 'market_research' })
      .select('title createdAt')
      .sort('-createdAt');
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
