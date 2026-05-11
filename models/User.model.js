const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  credits: { type: Number, default: 50 },
  creditsUsed: { type: Number, default: 0 },
  stripeCustomerId: { type: String, default: '' },
  stripeSubscriptionId: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (p) { return bcrypt.compare(p, this.password); };
userSchema.methods.hasCredits = function (n = 1) { return this.credits >= n; };
userSchema.methods.useCredits = async function (n = 1) {
  this.credits -= n;
  this.creditsUsed += n;
  this.lastActive = Date.now();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
