import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import logger from "../../../Blog-backend/src/config/logger.js";
import env from "../../../Blog-backend/src/config/env.js";

/**
 * Global error-handling middleware.
 * Catches all errors thrown (or passed via next(err)) anywhere in the app.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let error = err;

  // ─── Normalize known error types ─────────────────────────

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.validation("Validation failed", details);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = ApiError.conflict(
      `Duplicate value '${value}' for field '${field}'`,
    );
  }

  // Mongoose bad ObjectId (cast error)
  if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Token has expired");
  }

  // ─── Build response ──────────────────────────────────────

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : "Internal server error";

  // Log non-operational (unexpected) errors
  if (!error.isOperational) {
    logger.error("Unexpected error", {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  const response = {
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message,
    },
  };

  // Include validation details if present
  if (error.details?.length > 0) {
    response.error.details = error.details;
  }

  // Include stack trace in development
  if (env.NODE_ENV === "development") {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
