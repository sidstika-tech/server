const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, required: true },
  text: { type: String, required: true, maxlength: 500 },
}, { timestamps: true });

const communityPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  type: { type: String, enum: ['comment','question','review','success'], default: 'comment' },
  text: { type: String, required: true, maxlength: 1000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [replySchema],
  pinned: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
