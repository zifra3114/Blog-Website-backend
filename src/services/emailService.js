import nodemailer from "nodemailer";

// ✅ FIXED PATHS: Workspace configuration ke mutabiq relative paths corect kar diye hain
import env from "../config/env.js";
import logger from "../config/logger.js";

// ─── Transporter ───────────────────────────────────────────────

let transporter = null;

// Initialize transporter only if SMTP credentials are provided
const initTransporter = async () => {
  if (transporter) return transporter;

  // If no SMTP credentials, create test account for development
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV === "development") {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info("Using Ethereal test email account");
        return transporter;
      } catch (err) {
        logger.warn("Failed to create test email account:", err.message);
        return null;
      }
    }
    logger.warn("SMTP credentials not configured - emails will not be sent");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    // ✅ FIXED: Number parsers ke sath safe extraction to avoid data type mismatch strings
    port: parseInt(env.SMTP_PORT, 10) || 587,
    secure: parseInt(env.SMTP_PORT, 10) === 465, // "465" ko integer bana kar safely strictly compare kiya hai
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
};

// ─── Core send function ────────────────────────────────────────

/**
 * Send an email.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const emailTransporter = await initTransporter();

    if (!emailTransporter) {
      logger.warn(`Email not sent (no transporter): ${subject} to ${to}`);
      return null;
    }

    const info = await emailTransporter.sendMail({
      // ✅ FIXED: Fallback handle kiya hai agar variable set na ho
      from: env.EMAIL_FROM || `"LinkedIn Blog Admin" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    // Log preview URL in development (Ethereal provides this)
    if (env.NODE_ENV === "development") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Email preview: ${previewUrl}`);
      }
    }

    return info;
  } catch (error) {
    logger.error("Failed to send email:", error.message);
    throw error;
  }
};

// ─── Email templates ───────────────────────────────────────────

/**
 * Send email verification link.
 */
export const sendVerificationEmail = async (user, rawToken) => {
  const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0a66c2;">Verify Your Email</h2>
      <p>Hi ${user.name},</p>
      <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}"
           style="background-color: #0a66c2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    html,
  });
};

/**
 * Send password reset link.
 */
export const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0a66c2;">Reset Your Password</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background-color: #0a66c2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 14px;">This link will expire in 1 hour.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html,
  });
};