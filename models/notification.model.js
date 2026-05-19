const mongoose = require('mongoose');

/* ──────────────────────────────────────────────────────────────────
   NOTIFICATION MODEL
   In-app first (email integration ready via "channels" field).
   Used by: Competitor Tracker weekly digest, system alerts,
   Academy milestone unlocks, billing reminders.
──────────────────────────────────────────────────────────────────── */
const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'competitor_update',   // Weekly tracker digest
      'competitor_alert',    // Urgent competitor move (price drop, new launch)
      'academy_milestone',   // Step completed in 5-step path
      'system',              // Platform announcements
      'billing',             // Plan/payment events
    ],
    default: 'system',
    required: true,
  },
  title:   { type: String, required: true, maxlength: 140 },
  body:    { type: String, required: true, maxlength: 2000 },
  icon:    { type: String, default: '◎' },
  actionUrl:   { type: String, default: null },   // Where the CTA leads
  actionLabel: { type: String, default: null },   // Button text
  meta:    { type: mongoose.Schema.Types.Mixed, default: {} }, // Free-form payload (e.g. competitorId)
  read:    { type: Boolean, default: false, index: true },
  // Delivery channels — extensible for email/SMS/push later
  channels: {
    inApp:   { type: Boolean, default: true },
    email:   { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },
  },
}, { timestamps: true });

// Compound index for the common query: "unread for user, newest first"
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
