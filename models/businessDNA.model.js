const mongoose = require('mongoose');

const businessDNASchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // DNA Form answers
  fullName:       { type: String },
  country:        { type: String, required: true },
  city:           { type: String },
  industry:       { type: String, required: true },
  skills:         { type: String, required: true },
  budget:         { type: String, required: true },
  timeAvailable:  { type: String, required: true },
  experience:     { type: String, required: true },
  goal:           { type: String, required: true },
  // Generated result
  matchResult: {
    businessMatch:    { type: String },
    whyMatch:         { type: String },
    marketOpportunity:{ type: String },
    startingSteps:    { type: [String] },
    estimatedRevenue: { type: String },
    riskLevel:        { type: String },
    score:            { type: Number },
    scoreBreakdown: {
      marketOpportunity:  { type: Number },
      financialViability: { type: Number },
      competitionRisk:    { type: Number },
      executionReadiness: { type: Number },
      marketingStrength:  { type: Number },
      fundability:        { type: Number },
    },
    fullContent: { type: String },
  },
  // Journey tracking
  journeyStage: {
    type: String,
    enum: ['idea','validated','branded','marketing','launched','growing'],
    default: 'idea'
  },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('BusinessDNA', businessDNASchema);
