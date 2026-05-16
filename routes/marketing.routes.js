const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketing.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkMarketing } = require('../middleware/usageLimit.middleware');

router.post('/build', protect, checkMarketing, ctrl.build);
router.get('/reports', protect, ctrl.getReports);
router.delete('/reports/:id', protect, ctrl.deleteReport);

module.exports = router;
