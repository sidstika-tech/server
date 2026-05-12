const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketing.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/build', protect, ctrl.build);
router.get('/reports', protect, ctrl.getReports);
router.delete('/reports/:id', protect, ctrl.deleteReport);

module.exports = router;
