import { Router } from 'express';
import authRoutes from './authRoutes.js';
import postRoutes from './postRoutes.js';
import userRoutes from './userRoutes.js';
import feedRoutes from './feedRoutes.js';
import searchRoutes from './searchRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import bookmarkRoutes from './bookmarkRoutes.js';
import { postCommentsRouter, commentRouter } from './commentRoutes.js';

const router = Router();

// ─── Health check (Sabse Upar - Isko kisi middleware se takrana nahi chahiye) ───
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Mount routes (Order Highly Optimized) ──────────────────────

router.use('/auth', authRoutes);

// FIX 1: Lamba aur zyada specific nested route hamesha `/posts` se UPAR hona chahiye
// Taaki `/posts/:postId/comments` ko `/posts/:slug` ya `/posts/:id` intercept na kar sake
router.use('/posts/:postId/comments', postCommentsRouter);
router.use('/posts', postRoutes);

router.use('/comments', commentRouter);
router.use('/feed', feedRoutes);
router.use('/search', searchRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/bookmarks', bookmarkRoutes);

export default router;