const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const Generation = require('../models/Generation.model');

router.get('/', auth, async (req, res) => {
  try {
    const { type, page = 1, limit = 12 } = req.query;
    const query = { userId: req.user._id };
    if (type && type !== 'all') query.type = type;
    const total = await Generation.countDocuments(query);
    const items = await Generation.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, items, total, pages: Math.ceil(total/limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Generation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
