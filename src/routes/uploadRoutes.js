import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { uploadSingle, handleMulterError } from "../middlewares/upload.js";
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
  authenticate,                        // 1. Pehle check karo user login hai ya nahi
  validate({ body: uploadBodySchema }),// 2. Phir check karo data valid hai ya nahi (FIXED POSITION)
  uploadLimiter,                       // 3. Phir check karo rate limit to cross nahi hui
  uploadSingle,                        // 4. Ab file upload karo
  handleMulterError,                   // 5. Agar upload mein error aaye to handle karo
  uploadController.uploadImage,        // 6. Akhir mein controller chalao
);

export default router;