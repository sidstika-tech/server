const express = require('express');
const router = express.Router();
const { auth, requireCredits } = require('../middleware/auth.middleware');
const { generateTool } = require('../services/ai.service');
const Generation = require('../models/Generation.model');

const TOOLS = [
  { id: 'logo', name: 'Logo Concept Generator', icon: '🎨', desc: 'AI logo concepts & brand identity', credits: 2 },
  { id: 'name', name: 'Startup Name Generator', icon: '💡', desc: 'Unique, brandable business names', credits: 1 },
  { id: 'pitch', name: 'Pitch Deck Builder', icon: '📊', desc: 'Investor-ready elevator pitch', credits: 2 },
  { id: 'email', name: 'Cold Email Writer', icon: '📧', desc: 'High-converting cold outreach', credits: 1 },
  { id: 'contract', name: 'Contract Generator', icon: '📋', desc: 'Basic service agreements', credits: 2 },
  { id: 'adcopy', name: 'Ad Copy Generator', icon: '📣', desc: 'Meta, Google & social ads copy', credits: 2 },
];

router.get('/list', auth, (req, res) => res.json({ success: true, tools: TOOLS }));

router.post('/run', auth, async (req, res) => {
  try {
    const { toolId, input } = req.body;
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return res.status(400).json({ success: false, message: 'Invalid tool' });
    if (!req.user.hasCredits(tool.credits)) return res.status(402).json({ success: false, message: 'Insufficient credits', code: 'NO_CREDITS' });
    const output = await generateTool(toolId, input);
    await req.user.useCredits(tool.credits);
    await Generation.create({ userId: req.user._id, type: 'tool', title: `${tool.name}: ${input.slice(0,40)}`, input, output, creditsUsed: tool.credits, isSaved: true, status: 'completed', metadata: { toolId } });
    res.json({ success: true, output, credits: req.user.credits });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
