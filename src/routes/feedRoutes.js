import { Router } from 'express';
import Joi from 'joi';
import validate from '../middlewares/validate.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as feedService from '../services/feedService.js';

const router = Router();

// ─── Validation schemas ────────────────────────────────────────

const personalizedSchema = Joi.object({
  cursor: Joi.string().hex().length(24).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const trendingSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ─── Routes ────────────────────────────────────────────────────

/**
 * GET /feed
 * Personalized feed for authenticated users (cursor-based pagination).
 */
router.get(
  '/',
  authenticate,
  validate({ query: personalizedSchema }),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;
    const result = await feedService.getPersonalizedFeed(
      req.user._id,
      cursor || null,
      parseInt(limit) || 20
    );
    res.json(ApiResponse.ok(result));
  })
);

/**
 * GET /feed/trending
 * Trending posts (no auth required).
 */
router.get(
  '/trending',
  validate({ query: trendingSchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await feedService.getTrendingFeed(
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json(ApiResponse.paginated(result.posts, result.meta));
  })
);

export default router;
