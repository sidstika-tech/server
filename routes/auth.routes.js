const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { auth } = require('../middleware/auth.middleware');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ email, password, name: name || email.split('@')[0] });
    res.status(201).json({ success: true, token: sign(user._id), user: { id: user._id, email: user.email, name: user.name, plan: user.plan, credits: user.credits } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    user.lastActive = Date.now(); await user.save();
    res.json({ success: true, token: sign(user._id), user: { id: user._id, email: user.email, name: user.name, plan: user.plan, credits: user.credits, isAdmin: user.isAdmin } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: { id: req.user._id, email: req.user.email, name: req.user.name, plan: req.user.plan, credits: req.user.credits, creditsUsed: req.user.creditsUsed, isAdmin: req.user.isAdmin } });
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    req.user.name = name || req.user.name;
    await req.user.save();
    res.json({ success: true, user: req.user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
