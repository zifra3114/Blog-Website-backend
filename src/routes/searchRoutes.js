import { Router } from 'express';
import Joi from 'joi';
import validate from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as searchService from '../services/searchService.js';

const router = Router();

// ─── Validation schema ─────────────────────────────────────────

const searchSchema = Joi.object({
  q: Joi.string().min(2).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ─── Routes ────────────────────────────────────────────────────

/**
 * GET /search?q=
 * Unified search across posts and users.
 */
router.get(
  '/',
  validate({ query: searchSchema }),
  asyncHandler(async (req, res) => {
    // FIX: Joi automatically numbers ko cast kar deta hai, 
    // isliye controller mein baar-baar `parseInt` ya `||` lagane ki zaroorat nahi hai.
    const { q, page, limit } = req.query;

    const result = await searchService.searchAll(
      q,
      page,  // Ab yeh safe hai aur Joi se validate/cast ho kar aaya hai
      limit  // Ab yeh bhi safe hai
    );

    res.json(ApiResponse.ok(result));
  })
);

export default router;