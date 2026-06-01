import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
// FIX 1: Controller ka path bilkul sahi aur clean kar diya gaya hai
import * as bookmarkController from "../controllers/bookmarkController.js";

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

// FIX 2: MongoDB ObjectId validation ke liye schema banaya
const postIdParamSchema = Joi.object({
  postId: Joi.string().hex().length(24).required(),
});

// ─── Routes ────────────────────────────────────────────────────

/**
 * GET /bookmarks/collections
 * Get user's bookmark collections.
 * (Yeh static route upar hi rahega taaki neeche waale kisi dynamic route se na takraye)
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
  // FIX 3: body ke sath sath ab params (:postId) bhi strictly validate hoga
  validate({ 
    params: postIdParamSchema, 
    body: toggleSchema 
  }),
  bookmarkController.toggleBookmark,
);

export default router;