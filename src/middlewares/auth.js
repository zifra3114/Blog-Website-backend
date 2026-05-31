import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/index.js";
import logger from "../../../Blog-backend/src/config/logger.js";

/**
 * Authentication middleware.
 * Verifies the JWT access token from the Authorization header
 * and attaches the user to req.user.
 *
 * Usage: router.get('/protected', authenticate, controller);
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Missing or invalid Authorization header");
    throw ApiError.unauthorized("Access token is required");
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    logger.warn("Empty or invalid token");
    throw ApiError.unauthorized("Access token is required");
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    logger.warn("Token verification failed:", err.message);
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Access token has expired");
    }
    throw ApiError.unauthorized("Invalid access token");
  }

  // 3. Find user
  const user = await User.findById(decoded.sub);
  if (!user) {
    logger.warn(`User not found for token: ${decoded.sub}`);
    throw ApiError.unauthorized("User no longer exists");
  }
  if (!user.isActive) {
    logger.warn(`Inactive user attempted access: ${user._id}`);
    throw ApiError.unauthorized("Account has been deactivated");
  }

  // 4. Attach user to request
  req.user = user;
  next();
});

/**
 * Optional authentication — does NOT throw if no token is present.
 * Useful for routes that behave differently for logged-in users
 * (e.g. public posts that show "liked" state if authenticated).
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (user?.isActive) req.user = user;
    } catch {
      // silently ignore — route works without auth
    }
  }
  next();
});
