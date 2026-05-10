const Report = require('../models/report.model');
const User = require('../models/user.model');
const aiService = require('../services/ai.service');
const exportService = require('../services/export.service');

// Map tool type to generator function
const GENERATORS = {
  brand_kit:        (i) => aiService.generateBrandKit(i),
  business_name:    (i) => aiService.generateBusinessName(i),
  slogan:           (i) => aiService.generateSlogan(i),
  business_plan:    (i) => aiService.generateBusinessPlan(i),
  competitor_matrix:(i) => aiService.generateCompetitorMatrix(i),
  pricing_calculator:(i)=> aiService.generatePricingCalculator(i),
  launch_roadmap:   (i) => aiService.generateLaunchRoadmap(i),
  contract:         (i) => aiService.generateContract(i),
  budget_estimator: (i) => aiService.generateBudgetEstimator(i),
  pitch_deck:       (i) => aiService.generatePitchDeck(i),
  ad_copy:          (i) => aiService.generateAdCopy(i),
  seo_keywords:     (i) => aiService.generateSeoKeywords(i),
  content_calendar: (i) => aiService.generateContentCalendar(i),
  market_study:     (i) => aiService.generateMarketStudy(i),
  cold_email:       (i) => aiService.generateColdEmail(i),
  website_copy:     (i) => aiService.generateWebsiteCopy(i),
  sales_script:     (i) => aiService.generateSalesScript(i),
};

const TOOL_LABELS = {
  brand_kit: 'Brand Kit', business_name: 'Business Name Ideas', slogan: 'Slogan & Tagline',
  business_plan: 'Business Plan', competitor_matrix: 'Competitor Analysis', pricing_calculator: 'Pricing Strategy',
  launch_roadmap: '30-Day Launch Roadmap', contract: 'Contract Agreement', budget_estimator: 'Budget Estimator',
  pitch_deck: 'Investor Pitch Deck', ad_copy: 'Multi-Platform Ad Copy', seo_keywords: 'SEO Keyword Map',
  content_calendar: '30-Day Content Calendar', market_study: 'Market Study', cold_email: 'Cold Email Sequence',
  website_copy: 'Website Copy', sales_script: 'Sales Script'
};

// ── Generate any tool ───────────────────────────────────────────────────────
exports.generate = async (req, res) => {
  try {
    const { toolType, inputs } = req.body;
    if (!toolType || !inputs) return res.status(400).json({ error: 'toolType and inputs required' });
    if (!GENERATORS[toolType]) return res.status(400).json({ error: 'Unknown tool type: ' + toolType });

    const content = await GENERATORS[toolType](inputs);
    const label = TOOL_LABELS[toolType] || toolType;
    const title = `${label} — ${inputs.businessName || inputs.niche || inputs.industry || 'My Business'}`;
    const htmlContent = exportService.generateHTML(title, content);

    const report = await Report.create({
      user: req.user._id, title, type: toolType, content, htmlContent, inputs
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'usage.reportsGenerated': 1 } });
    res.json({ success: true, report: { ...report.toObject(), htmlContent } });
  } catch (err) {
    console.error('Tool generate error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Export endpoint — returns binary file ───────────────────────────────────
exports.exportReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query; // pdf | docx | pptx | html
    const report = await Report.findOne({ _id: id, user: req.user._id });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const fmt = (format || 'pdf').toLowerCase();
    const safeName = report.title.replace(/[^a-z0-9]/gi, '-').slice(0, 60);

    if (fmt === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.html"`);
      return res.send(report.htmlContent || exportService.generateHTML(report.title, report.content));
    }

    if (fmt === 'docx') {
      const buf = await exportService.generateDOCX(report.title, report.content);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
      return res.send(buf);
    }

    if (fmt === 'pptx') {
      const buf = await exportService.generatePPTX(report.title, report.content, report.inputs?.industry || '');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
      return res.send(buf);
    }

    // Default: PDF
    const buf = await exportService.generatePDF(report.title, report.content, report.inputs?.industry || '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return res.send(buf);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
};

// ── Get all reports for user ────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    const reports = await Report.find(filter).select('title type createdAt status inputs').sort('-createdAt').limit(100);
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single report ───────────────────────────────────────────────────────
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete report ───────────────────────────────────────────────────────────
exports.deleteReport = async (req, res) => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
