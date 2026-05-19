const mongoose = require('mongoose');

/* ──────────────────────────────────────────────────────────────────
   ACADEMY PROGRESS MODEL
   Tracks each user's journey through the 5-step Founder's Path.
   The 5 steps mirror the psychological journey from idea to launch:
     1. mindset       — Become the person who builds it
     2. validation    — Prove the idea before you waste a dirham
     3. positioning   — Why you, why now, why this offer
     4. launch        — Get the first paying customer
     5. growth        — Make it bigger than yourself

   Each step contains sessions. A session is "complete" when the
   user marks it done. This drives the unlocked-as-you-go UX —
   no skipping. Psychology: every checkbox = small dopamine win.
──────────────────────────────────────────────────────────────────── */

const sessionProgressSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },   // e.g. "step1.session3"
  completedAt: { type: Date, required: true },
  // Optional: user's own note after completing
  reflection: { type: String, default: '', maxlength: 1000 },
}, { _id: false });

const academyProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Which step they're currently on (1-5)
  currentStep: { type: Number, default: 1, min: 1, max: 5 },

  // Completed sessions across all steps
  completed: { type: [sessionProgressSchema], default: [] },

  // Streak — consecutive days of engagement (motivational mechanic)
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
  },

  // Milestone unlocks (used for badges + gamification)
  milestones: {
    firstSession: { type: Date, default: null },
    firstStepComplete: { type: Date, default: null },
    halfwayDone: { type: Date, default: null },
    pathComplete: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('AcademyProgress', academyProgressSchema);
