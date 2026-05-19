const mongoose = require('mongoose');

/* ──────────────────────────────────────────────────────────────────
   COMPETITOR TRACKER MODEL
   Each user can track up to N competitors in their market.
   Every Monday at 09:00 UTC, a cron job analyzes each competitor
   using Gemini, generates a "weekly intelligence" entry, and
   creates an in-app notification for the user.
──────────────────────────────────────────────────────────────────── */

const intelEntrySchema = new mongoose.Schema({
  // The week this intel covers (ISO date — Monday)
  weekOf: { type: Date, required: true },
  // The summary the user sees in the digest
  summary: { type: String, required: true, maxlength: 4000 },
  // Categorized signals
  signals: {
    pricing:   { type: String, default: '' },
    product:   { type: String, default: '' },
    marketing: { type: String, default: '' },
    hiring:    { type: String, default: '' },
    funding:   { type: String, default: '' },
  },
  // What this means for the user's business — the actionable part
  yourMove: { type: String, default: '' },
  threatLevel: {
    type: String,
    enum: ['low','medium','high','critical'],
    default: 'medium',
  },
}, { timestamps: true });

const competitorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Who we're tracking
  name:        { type: String, required: true, trim: true, maxlength: 120 },
  website:     { type: String, default: '', maxlength: 300 },
  country:     { type: String, default: '', maxlength: 80 },
  industry:    { type: String, default: '', maxlength: 160 },
  description: { type: String, default: '', maxlength: 1000 }, // What they do, in user's words

  // Why this competitor matters — user-supplied
  whyTracking: { type: String, default: '', maxlength: 500 },

  // History of weekly intel entries
  intel: { type: [intelEntrySchema], default: [] },

  // Last successful analysis
  lastAnalyzedAt: { type: Date, default: null },

  // User can pause tracking without deleting
  active: { type: Boolean, default: true },

  // Notification preferences for this specific competitor
  notify: {
    weekly: { type: Boolean, default: true },
    urgent: { type: Boolean, default: true },  // Major shifts mid-week
  },
}, { timestamps: true });

// One user, many competitors — index for fast lookups
competitorSchema.index({ user: 1, active: 1 });

module.exports = mongoose.model('Competitor', competitorSchema);
