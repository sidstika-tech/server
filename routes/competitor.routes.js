const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/competitor.controller');
const { protect } = require('../middleware/auth.middleware');

// Public cron endpoint — protected by CRON_SECRET inside controller
// Mounted BEFORE protect middleware. Vercel cron sends GET; manual triggers can POST.
router.get('/cron/weekly-digest', ctrl.runWeeklyDigest);
router.post('/cron/weekly-digest', ctrl.runWeeklyDigest);

// User-facing endpoints
router.use(protect);
router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.get('/preview-digest', ctrl.previewMyDigest);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/analyze', ctrl.analyzeNow);

module.exports = router;
