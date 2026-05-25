const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const tokenBlacklist = require('../middleware/tokenBlacklist');
const emailService = require('../services/email.service');

// 7-day tokens — shorter window reduces stolen-token exposure
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Generate random token for email verification and password reset
const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

exports.register = async (req, res) => {
  try {
    const { name, email, password, acceptedTerms } = req.body;
    
    // Validation
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!acceptedTerms) return res.status(400).json({ error: 'You must accept the Terms & Conditions' });

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    // Generate email verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({ 
      name: name.trim().slice(0, 100), 
      email, 
      password,
      acceptedTerms: true,
      acceptedTermsDate: new Date(),
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      isEmailVerified: false
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    // Return success but user must verify email
    res.status(201).json({ 
      success: true, 
      message: 'Account created! Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        error: 'Please verify your email before logging in. Check your inbox.',
        requiresVerification: true,
        email: user.email
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Return fresh data from DB so client always has current plan/usage
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

exports.logout = async (req, res) => {
  // Blacklist the current token so it cannot be reused
  if (req.token) {
    tokenBlacklist.add(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

/* ──────────────────────────────────────────────────────────────────
   EMAIL VERIFICATION
──────────────────────────────────────────────────────────────────── */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    // Generate login token
    const authToken = generateToken(user._id);

    res.json({ 
      success: true, 
      message: 'Email verified successfully! Welcome to Double Eight AI.',
      token: authToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

/* ──────────────────────────────────────────────────────────────────
   RESEND VERIFICATION EMAIL
──────────────────────────────────────────────────────────────────── */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    res.json({ 
      success: true, 
      message: 'Verification email sent! Please check your inbox.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
};

/* ──────────────────────────────────────────────────────────────────
   FORGOT PASSWORD - Request reset
──────────────────────────────────────────────────────────────────── */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

/* ──────────────────────────────────────────────────────────────────
   RESET PASSWORD - Set new password with token
──────────────────────────────────────────────────────────────────── */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password reset successfully! You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
};

/* ──────────────────────────────────────────────────────────────────
   ADMIN PROMOTION — protected by ADMIN_SECRET env var
   Usage:
     POST /api/auth/promote-admin
     Headers: { "x-admin-secret": "<your ADMIN_SECRET env value>" }
     Body:    { "email": "you@example.com", "admin": true }
   The user is upgraded to isAdmin + enterprise plan (zero limits).
   Set admin:false to revert.
──────────────────────────────────────────────────────────────────── */
exports.promoteAdmin = async (req, res) => {
  try {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });

    const provided = req.headers['x-admin-secret'];
    if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });

    const { email, admin = true } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'User not found. Register first, then promote.' });

    user.isAdmin = !!admin;
    if (admin) {
      // Bump them to enterprise plan as a belt-and-suspenders measure
      user.membership.plan = 'enterprise';
      user.membership.active = true;
      user.membership.endDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
    }
    await user.save();

    res.json({
      success: true,
      message: admin ? `${email} is now an admin with unlimited access` : `${email} is no longer an admin`,
      user: { email: user.email, isAdmin: user.isAdmin, plan: user.membership.plan },
    });
  } catch (err) {
    console.error('promoteAdmin error:', err);
    res.status(500).json({ error: 'Promotion failed.' });
  }
};
