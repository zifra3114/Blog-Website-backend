import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as postService from '../services/postService.js';

/**
 * POST /posts
 */
export const create = asyncHandler(async (req, res) => {
  let post = await postService.create(req.user._id, req.body);
  
  // ─── FIX: Instant Sync UI Ke Liye Author Populate Karein ───
  // Agar service seedha Mongoose document return karti hai, toh use yahan populate karein
  if (post && typeof post.populate === 'function') {
    await post.populate('author', 'username name avatar bio');
  } else if (post && post._id) {
    // Agar lean object hai, toh service se dubara fetch karlein complete details ke sath
    const viewerId = req.user._id;
    // getBySlug ya direct query se full details nikalne ke liye (agar slug available hai)
    if (post.slug) {
      post = await postService.getBySlug(post.slug, viewerId);
    }
  }

  res.status(201).json(ApiResponse.created(post));
});

/**
 * GET /posts
 */
export const list = asyncHandler(async (req, res) => {
  const viewerId = req.user?._id || null;
  const result = await postService.list(req.query, viewerId);
  res.json(ApiResponse.paginated(result.posts, result.meta));
});

/**
 * GET /posts/:slug
 */
export const getBySlug = asyncHandler(async (req, res) => {
  const viewerId = req.user?._id || null;
  const post = await postService.getBySlug(req.params.slug, viewerId);
  res.json(ApiResponse.ok(post));
});

/**
 * PATCH /posts/:id
 */
export const update = asyncHandler(async (req, res) => {
  const post = await postService.update(req.params.id, req.user._id, req.body);
  res.json(ApiResponse.ok(post, 'Post updated successfully'));
});

/**
 * DELETE /posts/:id
 */
export const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  await postService.remove(req.params.id, req.user._id, isAdmin);
  res.json(ApiResponse.ok(null, 'Post deleted successfully'));
});

/**
 * POST /posts/:id/like
 */
export const toggleLike = asyncHandler(async (req, res) => {
  const result = await postService.toggleLike(req.params.id, req.user._id);
  res.json(ApiResponse.ok(result));
});

/**
 * POST /posts/:id/repost
 */
export const toggleRepost = asyncHandler(async (req, res) => {
  const result = await postService.toggleRepost(req.params.id, req.user._id);
  res.json(ApiResponse.ok(result));
});

/**
 * GET /posts/user/:username
 */
export const getByUser = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const viewerId = req.user?._id || null;
  const result = await postService.getByUser(
    req.params.username,
    parseInt(page) || 1,
    parseInt(limit) || 20,
    viewerId
  );
  res.json(ApiResponse.paginated(result.posts, result.meta));
});

/**
 * GET /posts/search?q=
 */
export const search = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await postService.search(
    q,
    parseInt(page) || 1,
    parseInt(limit) || 20
  );
  res.json(ApiResponse.paginated(result.posts, result.meta));
});