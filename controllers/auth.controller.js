const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const tokenBlacklist = require('../middleware/tokenBlacklist');

// 7-day tokens — shorter window reduces stolen-token exposure
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name: name.trim().slice(0, 100), email, password });
    const token = generateToken(user._id);

    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Return fresh data from DB so client always has current plan/usage
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

exports.logout = async (req, res) => {
  // Blacklist the current token so it cannot be reused
  if (req.token) {
    tokenBlacklist.add(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

/* ──────────────────────────────────────────────────────────────────
   ADMIN PROMOTION — protected by ADMIN_SECRET env var
   Usage:
     POST /api/auth/promote-admin
     Headers: { "x-admin-secret": "<your ADMIN_SECRET env value>" }
     Body:    { "email": "you@example.com", "admin": true }
   The user is upgraded to isAdmin + enterprise plan (zero limits).
   Set admin:false to revert.
──────────────────────────────────────────────────────────────────── */
exports.promoteAdmin = async (req, res) => {
  try {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });

    const provided = req.headers['x-admin-secret'];
    if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });

    const { email, admin = true } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'User not found. Register first, then promote.' });

    user.isAdmin = !!admin;
    if (admin) {
      // Bump them to enterprise plan as a belt-and-suspenders measure
      user.membership.plan = 'enterprise';
      user.membership.active = true;
      user.membership.endDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
    }
    await user.save();

    res.json({
      success: true,
      message: admin ? `${email} is now an admin with unlimited access` : `${email} is no longer an admin`,
      user: { email: user.email, isAdmin: user.isAdmin, plan: user.membership.plan },
    });
  } catch (err) {
    console.error('promoteAdmin error:', err);
    res.status(500).json({ error: 'Promotion failed.' });
  }
};
