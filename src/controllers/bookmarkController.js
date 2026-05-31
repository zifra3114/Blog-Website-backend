import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as bookmarkService from '../services/bookmarkService.js';

/**
 * POST /bookmarks/:postId
 * Toggle bookmark on a post.
 */
export const toggleBookmark = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const result = await bookmarkService.toggleBookmark(
    req.user._id,
    req.params.postId,
    note
  );
  res.json(ApiResponse.ok(result));
});

/**
 * GET /bookmarks
 * Get current user's bookmarked posts.
 */
export const getUserBookmarks = asyncHandler(async (req, res) => {
  const { page, limit, collection } = req.query;
  const result = await bookmarkService.getUserBookmarks(
    req.user._id,
    parseInt(page) || 1,
    parseInt(limit) || 20,
    collection
  );
  res.json(ApiResponse.paginated(result.posts, result.meta));
});

/**
 * GET /bookmarks/collections
 * Get user's bookmark collections.
 */
export const getUserCollections = asyncHandler(async (req, res) => {
  const collections = await bookmarkService.getUserCollections(req.user._id);
  res.json(ApiResponse.ok(collections));
});
