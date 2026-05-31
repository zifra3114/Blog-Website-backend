import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import * as notificationController from "../../../Blog-backend/src/config/controllers/notificationController.js";

const router = Router();

// ─── Validation schema ─────────────────────────────────────────

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  unread: Joi.boolean().default(false),
});

// ─── Routes (all require auth) ─────────────────────────────────

router.use(authenticate);

router.get("/", validate({ query: listSchema }), notificationController.list);

router.get("/unread-count", notificationController.unreadCount);

router.patch("/:id/read", notificationController.markRead);

router.patch("/read-all", notificationController.markAllRead);

export default router;
