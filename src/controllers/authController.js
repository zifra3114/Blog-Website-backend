import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { refreshTokenCookieOptions } from '../utils/tokens.js';
import * as authService from '../services/authService.js';

/**
 * POST /auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  const meta = { userAgent: req.headers['user-agent'], ip: req.ip };

  const result = await authService.register({ name, username, email, password }, meta);

  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions());

  res.status(201).json(
    ApiResponse.created({
      user: result.user,
      accessToken: result.accessToken,
    })
  );
});

/**
 * POST /auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const meta = { userAgent: req.headers['user-agent'], ip: req.ip };

  const result = await authService.login({ email, password }, meta);

  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions());

  res.json(
    ApiResponse.ok({
      user: result.user,
      accessToken: result.accessToken,
    })
  );
});

/**
 * POST /auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const meta = { userAgent: req.headers['user-agent'], ip: req.ip };

  const result = await authService.refreshTokens(token, meta);

  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions());

  res.json(ApiResponse.ok({ accessToken: result.accessToken }));
});

/**
 * POST /auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  await authService.logout(token);

  res.clearCookie('refreshToken', { path: '/' });
  res.json(ApiResponse.ok(null, 'Logged out successfully'));
});

/**
 * GET /auth/me
 */
export const me = asyncHandler(async (req, res) => {
  res.json(ApiResponse.ok({ user: req.user }));
});

/**
 * POST /auth/verify-email/:token
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  await authService.verifyEmail(token);
  res.json(ApiResponse.ok(null, 'Email verified successfully'));
});

/**
 * POST /auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendVerification(email);
  res.json(ApiResponse.ok(null, 'Verification email sent'));
});

/**
 * POST /auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.json(ApiResponse.ok(null, 'Password reset email sent'));
});

/**
 * POST /auth/reset-password/:token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  await authService.resetPassword(token, password);
  res.json(ApiResponse.ok(null, 'Password reset successfully'));
});
