const mongoose = require('mongoose');

/* ──────────────────────────────────────────────────────────────────
   BUSINESS DNA — PSYCHOLOGICAL ARCHITECT MODEL
   Reads psychology from 8 questions. Stores: the raw answers,
   the AI's psychological profile, the recommended path, the 30-day
   failure-proof map, and scores.
──────────────────────────────────────────────────────────────────── */

const dnaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // ── Identity ──
  name:     { type: String, default: '' },
  country:  { type: String, default: '' },
  city:     { type: String, default: '' },
  language: { type: String, enum: ['en','ar'], default: 'en' },

  // ── The 8 Psychological Answers (raw user input) ──
  answers: {
    proudOf:          { type: String, default: '' },   // Q1
    energySource:     { type: String, default: '' },   // Q2
    couldDoBetter:    { type: String, default: '' },   // Q3
    peopleAskFor:     { type: String, default: '' },   // Q4
    whatYouHate:      { type: String, default: '' },   // Q5
    whatStopsYou:     { type: String, default: '' },   // Q6
    successLooksLike: { type: String, default: '' },   // Q7
    naturalMedium:    { type: String, default: '' },   // Q8
    budget:           { type: String, default: '' },   // Q9
  },

  // ── The AI's Psychological Read ──
  profile: {
    whoYouAre:      { type: String, default: '' },   // The Mirror sentence
    realStrength:   { type: String, default: '' },   // Hidden talent decoded
    workStyle:      { type: String, default: '' },   // Detective / Builder / Connector / Performer / Maker / Operator / Artisan / Hybrid
    energyType:     { type: String, default: '' },   // Extrovert-fueled / Introvert-fueled / Mixed
    motivationFuel: { type: String, default: '' },   // What actually drives them
    riskDNA:        { type: String, default: '' },   // Relationship with uncertainty
    avoidAtAllCost: { type: String, default: '' },   // What would destroy them
  },

  // ── The Recommended Path ──
  path: {
    name:              { type: String, default: '' }, // Specific path
    pathType:          { type: String, default: '' }, // business / freelance / hybrid / creator / service
    whyThisPath:       { type: String, default: '' }, // Connects to their words
    whyNotAnotherPath: { type: String, default: '' }, // What they thought, why it would hurt
    marketFit:         { type: String, default: '' }, // Where this lives in country
    unfairAdvantage:   { type: String, default: '' }, // Unique combination
    realCost:          { type: String, default: '' }, // Emotional + practical cost
  },

  // ── 30-Day Failure-Proof Map ──
  thirtyDayMap: {
    week1_detective:   weekShape(),
    week2_smallAsk:    weekShape(),
    week3_firstDollar: weekShape(),
    week4_scale:       weekShape(),
  },

  // ── Scores (0-100) ──
  scores: {
    overall:         { type: Number, default: 0 },
    psychologyFit:   { type: Number, default: 0 },
    marketViability: { type: Number, default: 0 },
    executionFit:    { type: Number, default: 0 },
    riskBalance:     { type: Number, default: 0 },
  },

  // ── Outcome Estimates ──
  firstMilestone:   { type: String, default: '' },
  realisticRevenue: { type: String, default: '' },

  // ── Backwards-compat field for Launch Package controller ──
  // Allows existing package generators that read `matchResult.businessMatch` to keep working.
  // The new DNA controller fills this from `path.name` on every save.
  matchResult: {
    businessMatch:     { type: String, default: '' },
    whyMatch:          { type: String, default: '' },
    marketOpportunity: { type: String, default: '' },
    estimatedRevenue:  { type: String, default: '' },
    unfairAdvantage:   { type: String, default: '' },
    biggestRisk:       { type: String, default: '' },
  },

  // ── Lifecycle ──
  completedAt:  { type: Date, default: null },
  journeyStage: { type: String, enum: ['pending','generated','validated','branded','marketing','launched'], default: 'pending' },
}, { timestamps: true });

function weekShape() {
  return {
    theme:     { type: String, default: '' },
    actions:   { type: [String], default: [] },
    avoid:     { type: String, default: '' },
    psychTrap: { type: String, default: '' },
  };
}

module.exports = mongoose.model('BusinessDNA', dnaSchema);
