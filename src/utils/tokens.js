import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../../../Blog-backend/src/config/env.js";

/**
 * Sign an access token (short-lived, stored in memory on client).
 */
export const signAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
};

/**
 * Sign a refresh token (long-lived, stored in HttpOnly cookie + DB).
 */
export const signRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
};

/**
 * Verify an access token. Returns decoded payload or throws.
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token. Returns decoded payload or throws.
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Generate a cryptographically secure verification/reset token.
 * Returns the raw token (to send in email) and the hashed token (to store in DB).
 */
export const generateVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  return { rawToken, hashedToken };
};

/**
 * Cookie options for the refresh token.
 * HttpOnly + Secure + SameSite prevents XSS and CSRF.
 */
export const refreshTokenCookieOptions = () => {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_REFRESH_EXPIRY)
    path: "/",
  };
};
