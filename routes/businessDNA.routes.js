const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessDNA.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/',         protect, ctrl.getDNA);
router.post('/generate',protect, ctrl.generateDNA);
router.put('/stage',    protect, ctrl.updateStage);
router.delete('/reset', protect, ctrl.resetDNA);

module.exports = router;
