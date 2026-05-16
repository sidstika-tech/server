const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketResearch.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkMarketResearch } = require('../middleware/usageLimit.middleware');

router.post('/analyze', protect, checkMarketResearch, ctrl.analyze);
router.get('/reports', protect, ctrl.getReports);
router.delete('/reports/:id', protect, ctrl.deleteReport);

module.exports = router;
