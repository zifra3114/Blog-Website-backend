import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { uploadSingle, uploadVideoSingle, handleMulterError } from "../middlewares/upload.js";
import { uploadLimiter } from "../middlewares/rateLimiter.js";
// FIX: Path ko theek kiya (Apne folder structure ke mutabiq check kar lein)
import * as uploadController from "../controllers/uploadController.js"; 

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
  validate({ body: uploadBodySchema }),
  uploadLimiter,
  uploadSingle,
  handleMulterError,
  uploadController.uploadImage,
);

// ─── Video upload route ────────────────────────────────────────
router.post(
  "/video",
  authenticate,
  uploadLimiter,
  uploadVideoSingle,
  handleMulterError,
  uploadController.uploadVideo,
);
export default router;