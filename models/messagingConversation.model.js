const mongoose = require('mongoose');

const messagingConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['instagram', 'facebook', 'whatsapp'], required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, default: null },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

messagingConversationSchema.index({ user: 1, platform: 1, senderId: 1 }, { unique: true });
messagingConversationSchema.index({ lastMessageAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('MessagingConversation', messagingConversationSchema);
