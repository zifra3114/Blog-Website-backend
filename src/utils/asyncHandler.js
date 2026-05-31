/**
 * Wraps an async route handler so thrown errors are forwarded
 * to Express error-handling middleware instead of crashing.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
