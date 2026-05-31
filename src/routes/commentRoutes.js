import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { authorizeOwner } from "../middlewares/authorize.js";
import * as commentController from "../../../Blog-backend/src/config/controllers/commentController.js";
import { Comment } from "../models/index.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
  parentComment: Joi.string().hex().length(24).optional(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
});

// ─── Nested routes under /posts/:postId/comments ───────────────

// These are mounted in the main router as:
//   app.use('/api/v1/posts/:postId/comments', commentRoutes)
//   app.use('/api/v1/comments', commentRoutes)

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

// Standalone comment routes (for /api/v1/comments/:id)
const commentRouter = Router();

commentRouter.get("/:id/replies", commentController.listReplies);

commentRouter.patch(
  "/:id",
  authenticate,
  authorizeOwner(async (req) => {
    const comment = await Comment.findById(req.params.id).select("author");
    return comment?.author;
  }),
  validate({ body: updateCommentSchema }),
  commentController.update,
);

commentRouter.delete(
  "/:id",
  authenticate,
  authorizeOwner(async (req) => {
    const comment = await Comment.findById(req.params.id).select("author");
    return comment?.author;
  }),
  commentController.remove,
);

commentRouter.post("/:id/like", authenticate, commentController.toggleLike);

export { postCommentsRouter, commentRouter };
