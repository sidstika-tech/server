const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  logout, 
  promoteAdmin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Email verification
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ADMIN PROMOTION — protected by x-admin-secret header (no JWT needed)
router.post('/promote-admin', promoteAdmin);

module.exports = router;
