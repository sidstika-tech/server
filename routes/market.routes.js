// market.routes.js
const express = require('express');
const router = express.Router();
const { auth, requireCredits } = require('../middleware/auth.middleware');
const { generateMarketResearch } = require('../services/ai.service');
const Generation = require('../models/Generation.model');

const TRENDING = [
  { niche: 'AI Productivity Tools', demandScore: 94, profitScore: 88, competition: 'Medium', growth: '+340%' },
  { niche: 'Sustainable Fashion', demandScore: 82, profitScore: 71, competition: 'High', growth: '+180%' },
  { niche: 'Health & Wellness SaaS', demandScore: 89, profitScore: 85, competition: 'Medium', growth: '+220%' },
  { niche: 'Remote Work Tools', demandScore: 91, profitScore: 79, competition: 'High', growth: '+156%' },
  { niche: 'Pet Care Premium', demandScore: 76, profitScore: 82, competition: 'Low', growth: '+92%' },
  { niche: 'Digital Education', demandScore: 88, profitScore: 90, competition: 'Medium', growth: '+265%' },
];

router.get('/trending', auth, (req, res) => res.json({ success: true, trending: TRENDING }));

router.post('/research', auth, requireCredits(3), async (req, res) => {
  try {
    const { niche } = req.body;
    if (!niche) return res.status(400).json({ success: false, message: 'Niche required' });
    const data = await generateMarketResearch(niche);
    await req.user.useCredits(3);
    await Generation.create({ userId: req.user._id, type: 'research', title: `Research: ${niche}`, input: niche, output: data, creditsUsed: 3, isSaved: true, status: 'completed' });
    res.json({ success: true, data, credits: req.user.credits });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
