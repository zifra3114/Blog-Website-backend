import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as userService from "../services/userService.js";

/**
 * GET /users/:username
 */
export const getProfile = asyncHandler(async (req, res) => {
  const viewerId = req.user?._id || null;
  const profile = await userService.getProfile(req.params.username, viewerId);
  res.json(ApiResponse.ok(profile));
});

/**
 * PATCH /users/me
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.json(ApiResponse.ok(user, "Profile updated successfully"));
});

/**
 * POST /users/:id/follow
 */
export const toggleFollow = asyncHandler(async (req, res) => {
  const result = await userService.toggleFollow(req.user._id, req.params.id);
  res.json(ApiResponse.ok(result));
});

/**
 * GET /users/:id/followers
 */
export const getFollowers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await userService.getFollowers(
    req.params.id,
    parseInt(page) || 1,
    parseInt(limit) || 20,
  );
  res.json(ApiResponse.paginated(result.users, result.meta));
});

/**
 * GET /users/:id/following
 */
export const getFollowing = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await userService.getFollowing(
    req.params.id,
    parseInt(page) || 1,
    parseInt(limit) || 20,
  );
  res.json(ApiResponse.paginated(result.users, result.meta));
});

/**
 * GET /users/search?q=
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await userService.searchUsers(
    q,
    parseInt(page) || 1,
    parseInt(limit) || 20,
  );
  res.json(ApiResponse.paginated(result.users, result.meta));
});
