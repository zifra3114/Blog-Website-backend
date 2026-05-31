import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as commentService from '../services/commentService.js';

/**
 * POST /posts/:postId/comments
 */
export const create = asyncHandler(async (req, res) => {
  const { content, parentComment } = req.body;
  const comment = await commentService.create(
    req.params.postId,
    req.user._id,
    content,
    parentComment
  );
  res.status(201).json(ApiResponse.created(comment));
});

/**
 * GET /posts/:postId/comments
 */
export const listByPost = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await commentService.listByPost(
    req.params.postId,
    parseInt(page) || 1,
    parseInt(limit) || 20
  );
  res.json(ApiResponse.paginated(result.comments, result.meta));
});

/**
 * GET /comments/:id/replies
 */
export const listReplies = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await commentService.listReplies(
    req.params.id,
    parseInt(page) || 1,
    parseInt(limit) || 20
  );
  res.json(ApiResponse.paginated(result.replies, result.meta));
});

/**
 * PATCH /comments/:id
 */
export const update = asyncHandler(async (req, res) => {
  const comment = await commentService.update(
    req.params.id,
    req.user._id,
    req.body.content
  );
  res.json(ApiResponse.ok(comment, 'Comment updated successfully'));
});

/**
 * DELETE /comments/:id
 */
export const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  await commentService.remove(req.params.id, req.user._id, isAdmin);
  res.json(ApiResponse.ok(null, 'Comment deleted successfully'));
});

/**
 * POST /comments/:id/like
 */
export const toggleLike = asyncHandler(async (req, res) => {
  const result = await commentService.toggleLike(req.params.id, req.user._id);
  res.json(ApiResponse.ok(result));
});
