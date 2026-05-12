const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');

const GENERATORS = {
  business_plan:     (i) => aiService.generateBusinessPlan(i),
  brand_kit:         (i) => aiService.generateBrandKit(i),
  competitor_matrix: (i) => aiService.generateCompetitorMatrix(i),
  launch_roadmap:    (i) => aiService.generateLaunchRoadmap(i),
  pitch_deck:        (i) => aiService.generatePitchDeck(i),
};
const LABELS = {
  business_plan:'Business Plan', brand_kit:'Brand Kit',
  competitor_matrix:'Competitor Analysis', launch_roadmap:'30-Day Launch Roadmap', pitch_deck:'Pitch Deck'
};

exports.generate = async (req, res) => {
  try {
    const { type, inputs } = req.body;
    if (!type || !inputs) return res.status(400).json({ error: 'Type and inputs required' });
    const gen = GENERATORS[type];
    if (!gen) return res.status(400).json({ error: 'Invalid report type: ' + type });

    const content = await gen(inputs);
    const label = LABELS[type] || type;
    const title = `${label} — ${inputs.businessName || inputs.niche || 'My Business'}`;

    const report = await Report.create({ user: req.user._id, title, type, content, inputs });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1 } });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id, type: { $in: Object.keys(GENERATORS) } })
      .select('title type createdAt status inputs').sort('-createdAt').limit(50);
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, report });
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
