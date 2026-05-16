const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const tokenBlacklist = require('./tokenBlacklist');

const ensureConnection = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
};

const protect = async (req, res, next) => {
  try {
    await ensureConnection();

    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Reject blacklisted (logged-out) tokens
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Attach raw token so logout controller can blacklist it
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({ error: 'Not authorized' });
  }
};

const requirePlan = (plans) => (req, res, next) => {
  if (!plans.includes(req.user.membership.plan)) {
    return res.status(403).json({
      error: 'Upgrade required',
      requiredPlans: plans,
      currentPlan: req.user.membership.plan,
    });
  }
  next();
};

module.exports = { protect, requirePlan };
