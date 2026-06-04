const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platforms: [{ type: String, enum: ['instagram', 'facebook', 'whatsapp'] }],
  content: { type: String, required: true, maxlength: 5000 },
  mediaUrl: { type: String, default: null },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'published', 'failed'], default: 'scheduled' },
  publishedAt: { type: Date, default: null },
  error: { type: String, default: null },
  results: { type: Object, default: {} },
}, { timestamps: true });

scheduledPostSchema.index({ user: 1, scheduledAt: 1 });
scheduledPostSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);
