const nodemailer = require('nodemailer');

/**
 * Create transporter on-demand (better for serverless)
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    pool: false,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5
  });
}

/**
 * Send email verification link
 */
exports.sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://doubleeight.online'}/pages/verify-email.html?token=${token}`;
  
  const mailOptions = {
    from: `"Double Eight AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '✅ Verify Your Double Eight AI Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Double Eight AI</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}! 👋</h2>
            <p>Thank you for joining Double Eight AI.</p>
            <p>Please verify your email address to activate your account:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 30px;">
              Link: <a href="${verificationUrl}" style="color: #f59e0b;">${verificationUrl}</a>
            </p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5);">⚠️ This link expires in 24 hours.</p>
          </div>
          <div class="footer">
            <p>Double Eight AI | Built for MENA Entrepreneurs</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to', email);
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
  const resetUrl = `${process.env.FRONTEND_URL || 'https://doubleeight.online'}/pages/reset-password.html?token=${token}`;
  
  const mailOptions = {
    from: `"Double Eight AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Double Eight AI</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${name}, Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 30px;">
              Link: <a href="${resetUrl}" style="color: #f59e0b;">${resetUrl}</a>
            </p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.5);">⚠️ This link expires in 1 hour.</p>
          </div>
          <div class="footer">
            <p>Double Eight AI</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email
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
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #07070f; }
          .container { max-width: 600px; margin: 40px auto; background: #0d0d1c; border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #07070f; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: rgba(255,255,255,0.9); }
          .content h2 { color: #fff; font-size: 22px; margin: 0 0 20px; }
          .content p { line-height: 1.8; font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #07070f; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; margin: 20px 0; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're All Set!</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>Your account is verified and ready. Start building your business today!</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://doubleeight.online'}/pages/dashboard.html" class="btn">Start Building</a>
            </div>
          </div>
          <div class="footer">
            <p>Double Eight AI | Built for MENA Entrepreneurs</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};
