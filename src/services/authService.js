import crypto from 'crypto';
import { User, RefreshToken, EmailVerification, PasswordReset } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
} from '../utils/tokens.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './emailService.js';

/**
 * Register a new user.
 */
export const register = async ({ name, username, email, password }, meta = {}) => {
  // Check if email or username already exists
  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    const field = existing.email === email ? 'Email' : 'Username';
    throw ApiError.conflict(`${field} is already taken`);
  }

  const user = await User.create({
    name,
    username,
    email,
    password,
  });

  const tokens = await generateTokens(user._id, meta);

  // Send verification email (fire-and-forget — don't block registration)
  try {
    const { rawToken, hashedToken } = generateVerificationToken();
    await EmailVerification.create({
      user: user._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    await sendVerificationEmail(user, rawToken);
  } catch (err) {
    // Log but don't fail registration if email sending fails
    console.error('Failed to send verification email:', err.message);
  }

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

/**
 * Login with email + password.
 */
export const login = async ({ email, password }, meta = {}) => {
  // Explicitly select password (it has select: false)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Account has been deactivated');
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = await generateTokens(user._id, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

/**
 * Rotate refresh token — issue new access + refresh tokens.
 */
export const refreshTokens = async (token, meta = {}) => {
  // Find and validate the refresh token in DB
  const stored = await RefreshToken.findOne({ token });
  if (!stored) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  // Verify JWT signature and expiry
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    // If JWT is expired/invalid, clean up the DB record
    await RefreshToken.deleteOne({ token });
    throw ApiError.unauthorized('Refresh token has expired');
  }

  // Rotate: delete old token, issue new pair
  await RefreshToken.deleteOne({ token });

  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or deactivated');
  }

  const tokens = await generateTokens(user._id, meta);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

/**
 * Logout — invalidate the refresh token.
 */
export const logout = async (refreshToken) => {
  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }
};

/**
 * Logout from all devices — revoke all refresh tokens for a user.
 */
export const logoutAll = async (userId) => {
  await RefreshToken.revokeAllForUser(userId);
};

/**
 * Verify email address with token from email link.
 */
export const verifyEmail = async (rawToken) => {
  // Hash the raw token to look up in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const record = await EmailVerification.findValid(hashedToken);
  if (!record) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  const user = await User.findById(record.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  // Delete the verification record
  await EmailVerification.deleteOne({ _id: record._id });

  return { message: 'Email verified successfully' };
};

/**
 * Resend verification email.
 */
export const resendVerification = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.notFound('No account found with that email');
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }

  // Invalidate any existing verification tokens
  await EmailVerification.invalidateForUser(user._id);

  // Generate and send new token
  const { rawToken, hashedToken } = generateVerificationToken();
  await EmailVerification.create({
    user: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await sendVerificationEmail(user, rawToken);

  return { message: 'Verification email sent' };
};

/**
 * Send password reset email.
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not (security best practice)
    return { message: 'If an account exists with that email, a password reset link has been sent' };
  }

  // Invalidate any existing reset tokens
  await PasswordReset.invalidateForUser(user._id);

  // Generate and send new token
  const { rawToken, hashedToken } = generateVerificationToken();
  await PasswordReset.create({
    user: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  try {
    await sendPasswordResetEmail(user, rawToken);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    // Don't throw - we don't want to reveal if email exists
  }

  return { message: 'If an account exists with that email, a password reset link has been sent' };
};

/**
 * Reset password with token from email link.
 */
export const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const record = await PasswordReset.findValid(hashedToken);
  if (!record) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const user = await User.findById(record.user._id).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Update password (pre-save hook handles hashing)
  user.password = newPassword;
  await user.save();

  // Delete the reset record
  await PasswordReset.deleteOne({ _id: record._id });

  // Revoke all refresh tokens (force logout on all devices)
  await RefreshToken.revokeAllForUser(user._id);

  return { message: 'Password reset successfully' };
};

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Generate access + refresh tokens and store the refresh token in DB.
 */
const generateTokens = async (userId, meta = {}) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  await RefreshToken.create({
    user: userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    userAgent: meta.userAgent || '',
    ip: meta.ip || '',
  });

  return { accessToken, refreshToken };
};

/**
 * Strip sensitive fields from user document.
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  headline: user.headline,
  bio: user.bio,
  avatar: user.avatar,
  coverImage: user.coverImage,
  location: user.location,
  website: user.website,
  skills: user.skills,
  socialLinks: user.socialLinks,
  followerCount: user.followerCount,
  followingCount: user.followingCount,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});
