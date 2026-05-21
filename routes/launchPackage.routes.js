const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/launchPackage.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/',                       protect, ctrl.getPackage);
router.get('/status',                 protect, ctrl.getStatus);
router.post('/generate-item',         protect, ctrl.generateItem);
router.post('/generate-all',          protect, ctrl.generateAll);            // legacy
router.post('/generate-all-background', protect, ctrl.generateAllBackground); // new
router.post('/cancel',                protect, ctrl.cancelJob);

module.exports = router;
