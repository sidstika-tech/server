const express = require('express');
const router = express.Router();
const { buildStrategy, getMarketingReports } = require('../controllers/marketing.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/build', buildStrategy);
router.get('/reports', getMarketingReports);

module.exports = router;
