import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/index.js";
// FIX 1: Path ko clean aur standard relative format mein badla
import logger from "../config/logger.js"; 

/**
 * Authentication middleware.
 * Verifies the JWT access token from the Authorization header
 * and attaches the user to req.user.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Missing or invalid Authorization header");
    // FIX 2: Explicitly next() mein error paas karein taaki Express global handler pakad sake
    return next(ApiError.unauthorized("Access token is required"));
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    logger.warn("Empty or invalid token");
    return next(ApiError.unauthorized("Access token is required"));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    logger.warn(`Token verification failed: ${err.message}`);
    if (err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Access token has expired"));
    }
    return next(ApiError.unauthorized("Invalid access token"));
  }

  // FIX 3: Safe MongoDB ObjectId format check taaki findById crash na ho
  if (!decoded.sub || !/^[0-9a-fA-F]{24}$/.test(decoded.sub)) {
    logger.warn(`Invalid user ID format in token: ${decoded.sub}`);
    return next(ApiError.unauthorized("Invalid access token structure"));
  }

  // 3. Find user
  const user = await User.findById(decoded.sub);
  if (!user) {
    logger.warn(`User not found for token: ${decoded.sub}`);
    return next(ApiError.unauthorized("User no longer exists"));
  }
  
  if (!user.isActive) {
    logger.warn(`Inactive user attempted access: ${user._id}`);
    return next(ApiError.unauthorized("Account has been deactivated"));
  }

  // 4. Attach user to request
  req.user = user;
  next();
});

/**
 * Optional authentication — does NOT throw if no token is present.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        const decoded = verifyAccessToken(token);
        
        // ID format check yahan bhi safe hai
        if (decoded.sub && /^[0-9a-fA-F]{24}$/.test(decoded.sub)) {
          const user = await User.findById(decoded.sub);
          if (user?.isActive) {
            req.user = user;
          }
        }
      }
    } catch {
      // silently ignore — route works without auth
    }
  }
  next();
});