const mongoose = require('mongoose');

const messagingIntegrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  instagram: {
    connected: { type: Boolean, default: false },
    pageId: { type: String, default: null },
    pageName: { type: String, default: null },
    pageAvatar: { type: String, default: null },
    accessToken: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },

  facebook: {
    connected: { type: Boolean, default: false },
    pageId: { type: String, default: null },
    pageName: { type: String, default: null },
    pageAvatar: { type: String, default: null },
    accessToken: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },

  whatsapp: {
    connected: { type: Boolean, default: false },
    phoneNumberId: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    accessToken: { type: String, default: null },
    wabaId: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },

  ai: {
    enabled: { type: Boolean, default: true },
    systemPrompt: { type: String, default: 'You are a helpful customer support assistant. Answer questions clearly and professionally. Be friendly and concise.', maxlength: 3000 },
    replyInstagram: { type: Boolean, default: true },
    replyFacebook: { type: Boolean, default: true },
    replyWhatsapp: { type: Boolean, default: true },
    autoPost: { type: Boolean, default: false },
    language: { type: String, enum: ['en', 'ar', 'auto'], default: 'auto' },
  },

  stats: {
    totalReplies: { type: Number, default: 0 },
    instagramReplies: { type: Number, default: 0 },
    facebookReplies: { type: Number, default: 0 },
    whatsappReplies: { type: Number, default: 0 },
    postsPublished: { type: Number, default: 0 },
    lastReplyAt: { type: Date, default: null },
  },

}, { timestamps: true });

module.exports = mongoose.model('MessagingIntegration', messagingIntegrationSchema);
