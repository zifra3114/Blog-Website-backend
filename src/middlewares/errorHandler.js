import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
// FIX 1: Path ko clean aur standard relative format mein badla
import logger from "../config/logger.js";
import env from "../config/env.js";

/**
 * Global error-handling middleware.
 * Catches all errors thrown (or passed via next(err)) anywhere in the app.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let error = err;

  // ─── Normalize known error types ─────────────────────────

  // 1. Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.validation("Validation failed", details);
  }

  // 2. Mongoose duplicate key error (code 11000)
  // FIX 2: Check kiya ke err.keyValue sach mein exist karta hai ya nahi taaki crash na ho
  else if (err && err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = ApiError.conflict(
      `Duplicate value '${value}' for field '${field}'`,
    );
  }

  // 3. Mongoose bad ObjectId (cast error)
  else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // 4. JWT errors
  else if (err && err.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid token");
  }
  else if (err && err.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Token has expired");
  }

  // ─── Build response ──────────────────────────────────────

  // FIX 3: Status code handle karne ka foolproof tareeqa
  const statusCode = error?.statusCode || 500;
  
  // Agar error custom ApiError se hai aur operational hai, to uska message bhejo warna generic
  const message = error?.isOperational ? error.message : "Internal server error";

  // Log non-operational (unexpected / unhandled) errors
  if (!error?.isOperational) {
    logger.error("Unexpected error", {
      message: err?.message || "No error message provided",
      stack: err?.stack,
      statusCode,
    });
  }

  const response = {
    success: false,
    error: {
      code: error?.code || "INTERNAL_ERROR",
      message,
    },
  };

  // Include validation details if present
  if (error?.details?.length > 0) {
    response.error.details = error.details;
  }

  // Include stack trace only in development environment
  if (env.NODE_ENV === "development") {
    response.error.stack = err?.stack || "";
  }

  res.status(statusCode).json(response);
};

export default errorHandler;