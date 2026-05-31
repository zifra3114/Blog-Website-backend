import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate, optionalAuth } from "../middlewares/auth.js";
import { authorizeOwner } from "../middlewares/authorize.js";
import * as postController from "../../../Blog-backend/src/config/controllers/postController.js";
import { Post } from "../models/index.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const createPostSchema = Joi.object({
  title: Joi.string().min(5).max(300).required(),
  content: Joi.string().min(50).max(50000).required(),
  tags: Joi.array().items(Joi.string().max(30).lowercase()).max(10).optional(),
  status: Joi.string().valid("draft", "published").default("draft"),
  coverImage: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }).optional(),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(5).max(300),
  content: Joi.string().min(50).max(50000),
  tags: Joi.array().items(Joi.string().max(30).lowercase()).max(10),
  status: Joi.string().valid("draft", "published"),
  coverImage: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }),
}).min(1); // at least one field required

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  tag: Joi.string().lowercase(),
  author: Joi.string(),
  sort: Joi.string().valid("newest", "popular", "trending").default("newest"),
  status: Joi.string().valid("draft", "published").default("published"),
});

const searchSchema = Joi.object({
  q: Joi.string().min(2).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ─── Routes ────────────────────────────────────────────────────

router.get("/search", validate({ query: searchSchema }), postController.search);

router.get("/user/:username", optionalAuth, postController.getByUser);

router.get(
  "/",
  optionalAuth,
  validate({ query: listSchema }),
  postController.list,
);

router.get("/:slug", optionalAuth, postController.getBySlug);

router.post(
  "/",
  authenticate,
  validate({ body: createPostSchema }),
  postController.create,
);

router.patch(
  "/:id",
  authenticate,
  authorizeOwner(async (req) => {
    const post = await Post.findById(req.params.id).select("author");
    return post?.author;
  }),
  validate({ body: updatePostSchema }),
  postController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorizeOwner(async (req) => {
    const post = await Post.findById(req.params.id).select("author");
    return post?.author;
  }),
  postController.remove,
);

router.post("/:id/like", authenticate, postController.toggleLike);

router.post("/:id/repost", authenticate, postController.toggleRepost);

export default router;
