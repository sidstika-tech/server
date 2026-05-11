// billing.routes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const User = require('../models/User.model');

const PLANS = {
  free: { name: 'Free', price: 0, credits: 50, features: ['50 credits/month', '5 credits per generation', 'Basic AI tools', 'Vault storage (10 items)'] },
  pro: { name: 'Pro', price: 29, credits: 500, features: ['500 credits/month', 'All AI tools', 'Unlimited vault', 'Priority AI', 'Download ZIP', 'Marketing builder'] },
  enterprise: { name: 'Enterprise', price: 99, credits: 2000, features: ['2000 credits/month', 'Everything in Pro', 'Admin panel access', 'API access', 'Custom branding', 'Dedicated support'] },
};

router.get('/plans', (req, res) => res.json({ success: true, plans: PLANS }));

router.post('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ success: false, message: 'Invalid plan' });
    // In production: integrate Stripe here
    req.user.plan = plan;
    req.user.credits = PLANS[plan].credits;
    await req.user.save();
    res.json({ success: true, message: `Upgraded to ${plan}`, user: req.user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
