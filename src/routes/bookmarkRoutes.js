import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import * as bookmarkController from "../../../Blog-backend/src/config/controllers/bookmarkController.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const toggleSchema = Joi.object({
  note: Joi.string().max(500).allow("").optional(),
});

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  collection: Joi.string().max(50).lowercase().optional(),
});

// ─── Routes ────────────────────────────────────────────────────

/**
 * GET /bookmarks/collections
 * Get user's bookmark collections.
 */
router.get("/collections", authenticate, bookmarkController.getUserCollections);

/**
 * GET /bookmarks
 * Get current user's bookmarked posts.
 */
router.get(
  "/",
  authenticate,
  validate({ query: listSchema }),
  bookmarkController.getUserBookmarks,
);

/**
 * POST /bookmarks/:postId
 * Toggle bookmark on a post.
 */
router.post(
  "/:postId",
  authenticate,
  validate({ body: toggleSchema }),
  bookmarkController.toggleBookmark,
);

export default router;
