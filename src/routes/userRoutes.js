import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import * as userController from "../../../Blog-backend/src/config/controllers/userController.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/),
  headline: Joi.string().max(220).allow(""),
  bio: Joi.string().max(2000).allow(""),
  location: Joi.string().max(100).allow(""),
  website: Joi.string().max(300).uri().allow("").optional(),
  skills: Joi.array().items(Joi.string().max(50)).max(30),
  avatar: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }).optional(),
  coverImage: Joi.object({
    url: Joi.string().uri().allow(""),
    publicId: Joi.string().allow(""),
  }).optional(),
  socialLinks: Joi.object({
    twitter: Joi.string().max(300).allow(""),
    linkedin: Joi.string().max(300).allow(""),
    github: Joi.string().max(300).allow(""),
    facebook: Joi.string().max(300).allow(""),
    instagram: Joi.string().max(300).allow(""),
    youtube: Joi.string().max(300).allow(""),
  }).optional(),
  experience: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().max(200).allow(""),
        company: Joi.string().max(200).allow(""),
        location: Joi.string().max(100).allow(""),
        startDate: Joi.date().allow(null),
        endDate: Joi.date().allow(null),
        current: Joi.boolean(),
        description: Joi.string().max(2000).allow(""),
      }),
    )
    .optional(),
  education: Joi.array()
    .items(
      Joi.object({
        school: Joi.string().max(200).allow(""),
        degree: Joi.string().max(200).allow(""),
        field: Joi.string().max(200).allow(""),
        startDate: Joi.date().allow(null),
        endDate: Joi.date().allow(null),
        current: Joi.boolean(),
        description: Joi.string().max(2000).allow(""),
      }),
    )
    .optional(),
}).min(1);

const followSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const searchSchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ─── Routes ────────────────────────────────────────────────────

router.get(
  "/search",
  validate({ query: searchSchema }),
  userController.searchUsers,
);

router.get("/:username", userController.getProfile);

router.patch(
  "/me",
  authenticate,
  validate({ body: updateProfileSchema }),
  userController.updateProfile,
);

router.post(
  "/:id/follow",
  authenticate,
  validate({ params: followSchema }),
  userController.toggleFollow,
);

router.get(
  "/:id/followers",
  validate({ query: paginationSchema }),
  userController.getFollowers,
);

router.get(
  "/:id/following",
  validate({ query: paginationSchema }),
  userController.getFollowing,
);

export default router;
