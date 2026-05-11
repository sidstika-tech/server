const Report = require('../models/report.model');
const User = require('../models/user.model');
const { generateBusinessPlan } = require('../services/ai.service');
const { markdownToHTML, extractTitle } = require('../services/generator.service');

exports.generate = async (req, res) => {
  try {
    const { type, inputs } = req.body;
    if (!type || !inputs) return res.status(400).json({ error: 'Type and inputs required' });

    let content = '';
    let title = '';

    switch (type) {
      case 'business_plan':
        content = await generateBusinessPlan(inputs);
        title = `Business Plan - ${inputs.businessName || 'My Business'}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const htmlContent = markdownToHTML(content, title);
    const report = await Report.create({
      user: req.user._id,
      title,
      type,
      content,
      htmlContent,
      inputs
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1 } });

    res.json({ success: true, report: { ...report.toObject(), htmlContent } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .select('title type createdAt status')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
