import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  unread: Joi.boolean().default(false),
});

// MongoDB ObjectId validation ke liye schema
const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

// ─── Routes (all require auth) ─────────────────────────────────

// Sabhi niche waale routes ke liye authentication lazmi hai
router.use(authenticate);

// 1. GET Routes
router.get("/unread-count", notificationController.unreadCount); // Static route upar
router.get("/", validate({ query: listSchema }), notificationController.list);

// 2. PATCH Routes
// FIX 1: Static route (`/read-all`) ko hamesha dynamic route (`/:id`) se UPAR hona chahiye
router.patch("/read-all", notificationController.markAllRead);

// FIX 2: Dynamic route ko neeche kiya aur sath mein ID validation (idParamSchema) bhi lagayi
router.patch(
  "/:id/read", 
  validate({ params: idParamSchema }), 
  notificationController.markRead
);

export default router;