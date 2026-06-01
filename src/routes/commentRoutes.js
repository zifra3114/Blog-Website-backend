import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { authorizeOwner } from "../middlewares/authorize.js";
// FIX 1: Controller ka path sahi kar diya (Fuzool lamba path hata diya)
import * as commentController from "../controllers/commentController.js";
import { Comment } from "../models/index.js";

// ─── Validation schemas ────────────────────────────────────────

const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
  parentComment: Joi.string().hex().length(24).optional(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
});

// MongoDB ObjectId validation ke liye schema (URL params ke liye)
const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

// Helper function: authorizeOwner ke andar safe database check ke liye (Server crash se bachane ke liye)
const getCommentAuthor = async (req) => {
  try {
    // Agar ID valid hex nahi hai to query hi mat karo aur safe return karo
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) return null;
    
    const comment = await Comment.findById(req.params.id).select("author");
    return comment ? comment.author : null;
  } catch (error) {
    return null; // Kisi bhi error par crash hone ke bajaye safe null return karega
  }
};

// ─── Nested routes under /posts/:postId/comments ───────────────

// Merge params so we can access both :postId and :id
const postCommentsRouter = Router({ mergeParams: true });

postCommentsRouter
  .route("/")
  .get(commentController.listByPost)
  .post(
    authenticate,
    validate({ body: createCommentSchema }),
    commentController.create,
  );

// ─── Standalone comment routes (for /api/v1/comments) ──────────

const commentRouter = Router();

// FIX 2: Sabhi routes par params: idParamSchema add kar diya taaki invalid IDs pehle hi block ho jayein
commentRouter.get(
  "/:id/replies", 
  validate({ params: idParamSchema }), 
  commentController.listReplies
);

commentRouter.patch(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }), // Validation pehle
  authorizeOwner(getCommentAuthor),    // FIX 3: Safe helper function use kiya
  validate({ body: updateCommentSchema }),
  commentController.update,
);

commentRouter.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }), // Validation pehle
  authorizeOwner(getCommentAuthor),    // FIX 3: Safe helper function use kiya
  commentController.remove,
);

commentRouter.post(
  "/:id/like", 
  authenticate, 
  validate({ params: idParamSchema }), 
  commentController.toggleLike
);

export { postCommentsRouter, commentRouter };