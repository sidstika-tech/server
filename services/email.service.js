const nodemailer = require('nodemailer');

// Zoho Mail SMTP Configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your Zoho email
    pass: process.env.SMTP_PASS  // Your Zoho password or app-specific password
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

/**
 * Send email verification link
 */
exports.sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"Double Eight AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '✅ Verify Your Double Eight AI Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .btn:hover { background: linear-gradient(135deg, #d97706, #b45309); }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
          .footer a { color: #f59e0b; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Double Eight AI</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}! 👋</h2>
            <p>Thank you for joining Double Eight AI — the platform built for MENA entrepreneurs.</p>
            <p>Please verify your email address to activate your account and start building your business:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #f59e0b; word-break: break-all;">${verificationUrl}</a>
            </p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 20px;">
              ⚠️ This link expires in 24 hours.
            </p>
          </div>
          <div class="footer">
            <p>If you didn't create this account, please ignore this email.</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://yourdomain.com'}">Double Eight AI</a> | Built for MENA Entrepreneurs</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset link
 */
exports.sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"Double Eight AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Reset Your Password - Double Eight AI',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
          .warning { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Double Eight AI</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>
            <div class="warning">
              <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                🔒 <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
              </p>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${resetUrl}" style="color: #f59e0b; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, please contact support immediately.</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://yourdomain.com'}">Double Eight AI</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email after verification
 */
exports.sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"Double Eight AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🎉 Welcome to Double Eight AI!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .feature { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 15px; margin: 10px 0; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're All Set!</h1>
          </div>
          <div class="content">
            <h2>Welcome to Double Eight AI, ${name}!</h2>
            <p>Your account is now verified and ready to use. Here's what you can do:</p>
            <div class="feature">
              <strong>🎯 Generate Business Plans</strong><br>
              <span style="font-size: 13px; color: rgba(255,255,255,0.6);">AI-powered business plans tailored for the MENA market</span>
            </div>
            <div class="feature">
              <strong>📊 Market Research</strong><br>
              <span style="font-size: 13px; color: rgba(255,255,255,0.6);">Get insights on your target market and competitors</span>
            </div>
            <div class="feature">
              <strong>🚀 Launch Package</strong><br>
              <span style="font-size: 13px; color: rgba(255,255,255,0.6);">Complete toolkit to launch your business</span>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'https://yourdomain.com'}/pages/dashboard.html" class="btn">Start Building</a>
            </div>
          </div>
          <div class="footer">
            <p>Need help? Reach out to our support team anytime.</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://yourdomain.com'}">Double Eight AI</a> | Built for MENA Entrepreneurs</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};
