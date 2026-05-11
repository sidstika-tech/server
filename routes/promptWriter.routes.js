const express = require('express');
const router = express.Router();
const { generatePrompt, getPlatforms, getPromptTypes, getPromptHistory } = require('../controllers/promptWriter.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/platforms', protect, getPlatforms);
router.get('/types', protect, getPromptTypes);
router.post('/generate', protect, generatePrompt);
router.get('/history', protect, getPromptHistory);

module.exports = router;
