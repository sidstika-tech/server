const express = require('express');
const router = express.Router();
const { research, getResearchReports } = require('../controllers/marketResearch.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/analyze', research);
router.get('/reports', getResearchReports);

module.exports = router;
