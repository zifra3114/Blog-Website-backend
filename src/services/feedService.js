import { Post, Follow, Bookmark } from "../models/index.js";
import logger from "../../../Blog-backend/src/config/logger.js";

/**
 * Generate a personalized feed for a user.
 * Returns ALL published posts sorted by newest first.
 * This ensures every post appears in the feed immediately after publishing.
 */
export const getPersonalizedFeed = async (
  userId,
  cursor = null,
  limit = 20,
) => {
  logger.info("Fetching personalized feed:", { userId, cursor, limit });

  let cursorDate = null;

  // If a cursor is provided, look up its timestamp to fetch older items
  if (cursor) {
    const cursorPost = await Post.findById(cursor).select("createdAt").lean();
    if (cursorPost) {
      cursorDate = cursorPost.createdAt;
    }
  }

  // Fetch ALL published posts (simplified approach for reliability)
  const query = {
    status: "published",
  };

  if (cursorDate) {
    query.createdAt = { $lt: cursorDate };
  }

  logger.info("Feed query:", JSON.stringify(query));

  const posts = await Post.find(query)
    .populate("author", "name username headline avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  logger.info(`Found ${posts.length} posts for feed`);

  // Add viewer-specific flags (isLiked, isSaved)
  const enrichedPosts = await Promise.all(
    posts.map(async (post) => {
      const isLiked = post.likes?.some((id) => id.equals(userId)) || false;
      const isBookmarked = await Bookmark.isBookmarked(userId, post._id);
      return {
        ...post,
        isLiked,
        isSaved: isBookmarked,
      };
    }),
  );

  // Calculate nextCursor and hasMore
  let nextCursor = null;
  let hasMore = false;

  if (enrichedPosts.length > 0) {
    const lastPost = enrichedPosts[enrichedPosts.length - 1];

    // Check if there are more posts
    const countRemaining = await Post.countDocuments({
      status: "published",
      createdAt: { $lt: lastPost.createdAt },
    });

    if (countRemaining > 0) {
      nextCursor = lastPost._id.toString();
      hasMore = true;
    }
  }

  logger.info("Feed result:", {
    postsCount: enrichedPosts.length,
    hasMore,
    nextCursor,
  });

  return {
    posts: enrichedPosts,
    nextCursor,
    hasMore,
  };
};

/**
 * Get trending posts (global, no auth required).
 */
export const getTrendingFeed = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [posts, total] = await Promise.all([
    Post.find({
      status: "published",
      createdAt: { $gte: weekAgo },
    })
      .populate("author", "name username headline avatar")
      .sort({ likeCount: -1, viewCount: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments({
      status: "published",
      createdAt: { $gte: weekAgo },
    }),
  ]);

  return {
    posts,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
