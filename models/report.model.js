const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'business_plan','market_research','marketing_strategy','financial_projection','competitive_analysis',
      'brand_kit','business_name','slogan','competitor_matrix','pricing_calculator','launch_roadmap',
      'contract','budget_estimator','pitch_deck','ad_copy','seo_keywords','content_calendar','market_study',
      'cold_email','website_copy','sales_script','prompt_writer'
    ],
    required: true
  },
  content: { type: String, required: true },
  htmlContent: { type: String, default: null },
  jsonData: { type: mongoose.Schema.Types.Mixed, default: null },
  inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'completed' },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
