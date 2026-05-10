const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

const requirePlan = (plans) => (req, res, next) => {
  if (!plans.includes(req.user.membership.plan)) {
    return res.status(403).json({ 
      error: 'Upgrade required', 
      requiredPlans: plans,
      currentPlan: req.user.membership.plan 
    });
  }
  next();
};

module.exports = { protect, requirePlan };
