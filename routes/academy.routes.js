const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/academy.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Daily news (existing behaviour preserved)
router.get('/daily', ctrl.getDaily);
router.post('/refresh', ctrl.refresh);

// The Founder's Path — 5-step guided learning
router.get('/path', ctrl.getPath);
router.get('/progress', ctrl.getProgress);
router.get('/session/:sessionId', ctrl.getSession);
router.post('/session/:sessionId/complete', ctrl.completeSession);

module.exports = router;
