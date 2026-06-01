import { Router } from 'express';
import Joi from 'joi';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
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
 * FIX 1: GET /feed/trending (Specific Route Upar kiya)
 * Trending posts (no auth required).
 */
router.get(
  '/trending',
  validate({ query: trendingSchema }),
  asyncHandler(async (req, res) => {
    // FIX 2: Joi validation ke baad data already casted hota hai, parseInt hata diya
    const { page, limit } = req.query; 
    
    const result = await feedService.getTrendingFeed(page, limit);
    res.json(ApiResponse.paginated(result.posts, result.meta));
  })
);

/**
 * FIX 1: GET /feed (Generic / Base Route Aakhir mein kiya)
 * Personalized feed for authenticated users (cursor-based pagination).
 */
router.get(
  '/',
  authenticate, // Ab yeh sirf isi route par chalega, /trending ko block nahi karega
  validate({ query: personalizedSchema }),
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;
    
    const result = await feedService.getPersonalizedFeed(
      req.user._id,
      cursor || null,
      limit
    );
    res.json(ApiResponse.ok(result));
  })
);

export default router;