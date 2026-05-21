const express = require('express');
const router = express.Router();
const { generate, generateImage, exportReport, getReports, getReport, deleteReport } = require('../controllers/tools.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkReport } = require('../middleware/usageLimit.middleware');

router.use(protect);

// Standard tool generators
router.post('/generate', checkReport, generate);

// Image generation — xAI Grok Aurora
router.post('/image/generate', checkReport, generateImage);

// Report management
router.get('/export/:id', exportReport);
router.get('/reports', getReports);
router.get('/reports/:id', getReport);
router.delete('/reports/:id', deleteReport);

module.exports = router;
