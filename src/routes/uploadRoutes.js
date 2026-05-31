import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { uploadSingle, handleMulterError } from "../middlewares/upload.js";
import { uploadLimiter } from "../middlewares/rateLimiter.js";
import * as uploadController from "../../../Blog-backend/src/config/controllers/uploadController.js";

const router = Router();

// ─── Validation schema ─────────────────────────────────────────

const uploadBodySchema = Joi.object({
  type: Joi.string().valid("avatar", "cover", "post").default("post"),
  entityId: Joi.string().hex().length(24).optional(),
});

// ─── Routes ────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  uploadLimiter,
  uploadSingle,
  handleMulterError,
  validate({ body: uploadBodySchema }),
  uploadController.uploadImage,
);

export default router;
