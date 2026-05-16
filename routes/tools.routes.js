const express = require('express');
const router = express.Router();
const { generate, exportReport, getReports, getReport, deleteReport } = require('../controllers/tools.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkReport } = require('../middleware/usageLimit.middleware');

router.use(protect);
router.post('/generate', checkReport, generate);
router.get('/export/:id', exportReport);
router.get('/reports', getReports);
router.get('/reports/:id', getReport);
router.delete('/reports/:id', deleteReport);

module.exports = router;
