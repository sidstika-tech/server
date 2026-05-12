const express = require('express');
const router = express.Router();
const { generate, getReports, getReport, deleteReport } = require('../controllers/generator.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/generate', generate);
router.get('/reports', getReports);
router.get('/reports/:id', getReport);
router.delete('/reports/:id', deleteReport);

module.exports = router;
