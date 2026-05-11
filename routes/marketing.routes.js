const express = require('express');
const router = express.Router();
const { auth, requireCredits } = require('../middleware/auth.middleware');
const { generateMarketing } = require('../services/ai.service');
const Generation = require('../models/Generation.model');

router.post('/generate', auth, requireCredits(4), async (req, res) => {
  try {
    const { business, platform = 'all' } = req.body;
    if (!business) return res.status(400).json({ success: false, message: 'Business name required' });
    const data = await generateMarketing(business, platform);
    await req.user.useCredits(4);
    await Generation.create({ userId: req.user._id, type: 'marketing', title: `Marketing: ${business}`, input: business, output: data, creditsUsed: 4, isSaved: true, status: 'completed', metadata: { platform } });
    res.json({ success: true, data, credits: req.user.credits });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
