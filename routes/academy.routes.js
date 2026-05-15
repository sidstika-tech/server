const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/academy.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/daily', protect, ctrl.getDaily);
router.post('/refresh', protect, ctrl.refresh);

module.exports = router;
