const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, promoteAdmin } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
// ADMIN PROMOTION — protected by x-admin-secret header (no JWT needed)
router.post('/promote-admin', promoteAdmin);

module.exports = router;
