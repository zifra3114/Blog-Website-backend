import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate, optionalAuth } from "../middlewares/auth.js";
import { authorizeOwner } from "../middlewares/authorize.js";
import * as postController from "../controllers/postController.js";
import { Post } from "../models/index.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

// ✅ FIXED: Joi validation limits ko 1 character kar diya hai taaki 422 error na aaye
const createPostSchema = Joi.object({
  title: Joi.string().min(1).max(300).required(),   // 5 se badal kar 1 kiya
  content: Joi.string().min(1).max(50000).required(), // 50 se badal kar 1 kiya
  tags: Joi.array().items(Joi.string().max(30).lowercase()).max(10).optional(),
  status: Joi.string().valid("draft", "published").default("draft"),
  coverImage: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }).optional(),
  coverVideo: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }).optional(),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(300),   // 5 se badal kar 1 kiya
  content: Joi.string().min(1).max(50000), // 50 se badal kar 1 kiya
  tags: Joi.array().items(Joi.string().max(30).lowercase()).max(10),
  status: Joi.string().valid("draft", "published"),
  coverImage: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }),
  coverVideo: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }),
}).min(1);

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

// ID Param validation ke liye schema (Crash se bachane ke liye)
const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

// Helper function: authorizeOwner ke andar safe database check ke liye
const getPostAuthor = async (req) => {
  try {
    // Agar ID valid hex nahi hai to query hi mat karo
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) return null;
    
    const post = await Post.findById(req.params.id).select("author");
    return post ? post.author : null;
  } catch (error) {
    return null; // Kisi bhi error par crash hone ke bajaye null return karega (Unauthorized)
  }
};

// ─── Routes ────────────────────────────────────────────────────

// 1. Static / Specific Routes (Hamesha sabse upar)
router.get("/search", validate({ query: searchSchema }), postController.search);
router.get("/user/:username", optionalAuth, postController.getByUser);

router.get(
  "/",
  optionalAuth,
  validate({ query: listSchema }),
  postController.list,
);

router.post(
  "/",
  authenticate,
  validate({ body: createPostSchema }),
  postController.create,
);

// 2. ID-based action routes (In mein ID validation lazmi daal di hai)
router.post(
  "/:id/like", 
  authenticate, 
  validate({ params: idParamSchema }), 
  postController.toggleLike
);

router.post(
  "/:id/repost", 
  authenticate, 
  validate({ params: idParamSchema }), 
  postController.toggleRepost
);

// 3. Owner Authorized Routes (PATCH / DELETE)
router.patch(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }), // FIX: Pehle params validate karo phir DB touch karo
  authorizeOwner(getPostAuthor),       // FIX: Safe function wrap kiya hai
  validate({ body: updatePostSchema }),
  postController.update,
);

router.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }), // FIX: Pehle params validate karo
  authorizeOwner(getPostAuthor),
  postController.remove,
);

// 4. Wildcard / Slug Route (Hamesha sabse aakhir mein taaki baki routes block na hon)
router.get("/:slug", optionalAuth, postController.getBySlug);

export default router;