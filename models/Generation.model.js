const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['business', 'store', 'marketing', 'research', 'tool', 'chat'], required: true },
  title: { type: String, default: 'Untitled' },
  category: { type: String, default: '' },
  input: { type: String, required: true },
  output: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  creditsUsed: { type: Number, default: 1 },
  isSaved: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  downloadUrl: { type: String, default: '' },
  zipPath: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Generation', generationSchema);
