/**
 * Standard API response envelope.
 * Every successful response follows this shape.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*}      data       - Response payload
   * @param {string} message    - Optional message
   * @param {object} meta       - Optional pagination metadata
   */
  constructor(statusCode, data, message = 'Success', meta = null) {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }

  // ─── Factory helpers ──────────────────────────────────────

  static ok(data, message = 'Success') {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static paginated(data, meta) {
    return new ApiResponse(200, data, 'Success', meta);
  }
}

export default ApiResponse;
