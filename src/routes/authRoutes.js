import { Router } from "express";
import Joi from "joi";
import validate from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import * as authController from "../../../Blog-backend/src/config/controllers/authController.js";

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Username may only contain letters, numbers, and underscores",
    }),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      "string.pattern.base":
        "Password must contain at least 1 uppercase, 1 lowercase, and 1 number",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      "string.pattern.base":
        "Password must contain at least 1 uppercase, 1 lowercase, and 1 number",
    }),
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});

// ─── Routes ────────────────────────────────────────────────────

router.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

router.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

router.post("/refresh", authController.refresh);

router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.me);

router.post("/verify-email/:token", authController.verifyEmail);

router.post(
  "/resend-verification",
  authLimiter,
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);

router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

router.post(
  "/reset-password/:token",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

export default router;
