import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate middleware.
 *
 * Usage: router.delete('/:id', authenticate, authorize('admin'), controller);
 *
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'user')
 */
export const authorize = (...roles) => {
  return (_req, _res, next) => {
    // req.user is set by authenticate middleware
    if (!roles.includes(_req.user.role)) {
      throw ApiError.forbidden(
        `Role '${_req.user.role}' is not authorized to access this resource`
      );
    }
    next();
  };
};

/**
 * Ownership-based authorization middleware.
 * Checks if the current user owns the resource OR is an admin.
 *
 * Usage:
 *   router.patch(
 *     '/:id',
 *     authenticate,
 *     authorizeOwner(async (req) => {
 *       const post = await Post.findById(req.params.id);
 *       return post?.author;   // returns the owner's userId
 *     }),
 *     controller
 *   );
 *
 * @param {Function} getOwnerId - Async function that returns the resource owner's _id
 */
export const authorizeOwner = (getOwnerId) => {
  return asyncHandler(async (req, _res, next) => {
    const ownerId = await getOwnerId(req);

    if (!ownerId) {
      throw ApiError.notFound('Resource not found');
    }

    const isOwner = ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You can only modify your own resources');
    }

    next();
  });
};
