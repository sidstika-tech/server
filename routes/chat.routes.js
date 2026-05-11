// chat.routes.js
const express = require('express');
const router = express.Router();
const { auth, requireCredits } = require('../middleware/auth.middleware');
const { businessChat } = require('../services/ai.service');
const Generation = require('../models/Generation.model');

router.post('/', auth, requireCredits(1), async (req, res) => {
  try {
    const { message, history = [], mode = 'advisor' } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });
    const response = await businessChat(message, history, mode);
    await req.user.useCredits(1);
    res.json({ success: true, response, credits: req.user.credits });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
