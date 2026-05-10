const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  messages: [messageSchema],
  model: { type: String, default: 'llama-3.3-70b-versatile' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
