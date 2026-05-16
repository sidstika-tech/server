const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/launchPackage.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/',              protect, ctrl.getPackage);
router.post('/generate-item',protect, ctrl.generateItem);
router.post('/generate-all', protect, ctrl.generateAll);

module.exports = router;
