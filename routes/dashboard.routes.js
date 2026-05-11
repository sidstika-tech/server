const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const Generation = require('../models/Generation.model');

router.get('/summary', auth, async (req, res) => {
  try {
    const [total, recent, byType] = await Promise.all([
      Generation.countDocuments({ userId: req.user._id }),
      Generation.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5).select('type title createdAt status creditsUsed'),
      Generation.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, summary: { total, recent, byType, credits: req.user.credits, creditsUsed: req.user.creditsUsed, plan: req.user.plan } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
