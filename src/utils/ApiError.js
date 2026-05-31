/**
 * Custom API error class.
 * Thrown anywhere in the app and caught by the global error handler.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message    - Human-readable error message
   * @param {Array}  details    - Optional validation details
   * @param {string} code       - Machine-readable error code
   */
  constructor(
    statusCode,
    message = 'Something went wrong',
    details = [],
    code = 'ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  // ─── Factory helpers ──────────────────────────────────────

  static badRequest(message = 'Bad request', details = []) {
    return new ApiError(400, message, details, 'BAD_REQUEST');
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, [], 'UNAUTHORIZED');
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, message, [], 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, [], 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, [], 'CONFLICT');
  }

  static validation(message = 'Validation failed', details = []) {
    return new ApiError(422, message, details, 'VALIDATION_ERROR');
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message, [], 'RATE_LIMIT');
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], 'INTERNAL_ERROR');
  }
}

export default ApiError;
