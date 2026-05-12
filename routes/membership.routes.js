const express = require('express');
const router = express.Router();
const { getPlans, getCurrentPlan, upgradePlan } = require('../controllers/membership.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/plans', getPlans);
router.get('/current', protect, getCurrentPlan);
router.post('/upgrade', protect, upgradePlan);

module.exports = router;
