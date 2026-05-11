const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const Generation = require('../models/Generation.model');

router.use(auth, adminOnly);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalGens, proUsers] = await Promise.all([
      User.countDocuments(),
      Generation.countDocuments(),
      User.countDocuments({ plan: { $in: ['pro','enterprise'] } }),
    ]);
    const creditsUsed = await User.aggregate([{ $group: { _id: null, total: { $sum: '$creditsUsed' } } }]);
    res.json({ success: true, stats: { totalUsers, totalGens, proUsers, creditsUsed: creditsUsed[0]?.total || 0 } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/credits/:userId', async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findByIdAndUpdate(req.params.userId, { $inc: { credits: amount } }, { new: true });
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
