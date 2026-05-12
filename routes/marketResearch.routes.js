const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketResearch.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/analyze', protect, ctrl.analyze);
router.get('/reports', protect, ctrl.getReports);
router.delete('/reports/:id', protect, ctrl.deleteReport);

module.exports = router;
