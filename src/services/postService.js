import { Post, Bookmark } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import pick from "../utils/pick.js";
import { notifyPostLike, notifyNewBlog } from "./notificationEmitter.js";
import { getIO } from "../../../Blog-backend/src/config/socket.js";
import logger from "../../../Blog-backend/src/config/logger.js";

/**
 * Create a new post.
 */
export const create = async (authorId, data) => {
  const allowed = pick(data, [
    "title",
    "content",
    "tags",
    "status",
    "coverImage",
  ]);

  logger.info("Creating post:", {
    authorId,
    title: allowed.title,
    status: allowed.status,
  });

  const post = await Post.create({
    ...allowed,
    author: authorId,
    publishedAt: allowed.status === "published" ? new Date() : null,
  });

  logger.info("Post created in database:", {
    postId: post._id,
    slug: post.slug,
    status: post.status,
  });

  await post.populate("author", "name username headline avatar");

  // Notify followers if published immediately
  if (post.status === "published") {
    logger.info(
      "Post is published, notifying followers and emitting Socket.IO event",
    );
    notifyNewBlog(post._id, authorId);

    // Emit real-time event for instant feed updates
    try {
      const io = getIO();
      // Broadcast to all connected users so they can update their feeds
      io.emit("post:new", {
        post: post.toJSON(),
      });
      logger.info(
        `✅ Emitted post:new event for post ${post._id} to all connected clients`,
      );
    } catch (err) {
      logger.error("❌ Failed to emit post:new event:", err.message);
    }
  } else {
    logger.info("Post is draft, skipping notifications");
  }

  return post;
};

/**
 * Update a post (owner or admin).
 */
export const update = async (postId, userId, updates) => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  // Ownership check (admin bypasses in controller)
  if (post.author.toString() !== userId.toString()) {
    throw ApiError.forbidden("You can only edit your own posts");
  }

  const allowed = pick(updates, [
    "title",
    "content",
    "tags",
    "status",
    "coverImage",
  ]);

  // Set publishedAt when transitioning to published
  const wasPublished = post.status === "published";
  if (allowed.status === "published" && !wasPublished) {
    allowed.publishedAt = new Date();
  }

  Object.assign(post, allowed);
  await post.save();

  // Notify followers when transitioning from draft to published
  if (allowed.status === "published" && !wasPublished) {
    notifyNewBlog(post._id, post.author);

    // Emit real-time event for instant feed updates
    try {
      const io = getIO();
      const populatedPost = await post.populate(
        "author",
        "name username headline avatar",
      );
      io.emit("post:new", {
        post: populatedPost.toJSON(),
      });
      logger.info(`Emitted post:new event for updated post ${post._id}`);
    } catch (err) {
      logger.error("Failed to emit post:new event:", err.message);
    }
  }

  return post.populate("author", "name username headline avatar");
};

/**
 * Delete a post.
 */
export const remove = async (postId, userId, isAdmin = false) => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  if (!isAdmin && post.author.toString() !== userId.toString()) {
    throw ApiError.forbidden("You can only delete your own posts");
  }

  await post.deleteOne();
  return { deleted: true };
};

/**
 * Get a single post by slug.
 */
export const getBySlug = async (slug, viewerId = null) => {
  // First find the post without status filter
  const post = await Post.findOne({ slug }).populate(
    "author",
    "name username headline avatar",
  );

  if (!post) throw ApiError.notFound("Post not found");

  // Check if post is published OR viewer is the author
  const isAuthor = viewerId && viewerId.equals(post.author._id);
  if (post.status !== "published" && !isAuthor) {
    throw ApiError.notFound("Post not found");
  }

  // Increment view count (but not for the author)
  if (!viewerId || !viewerId.equals(post.author._id)) {
    await Post.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });
  }

  // Check if viewer has liked / bookmarked
  let isLiked = false;
  let isBookmarked = false;
  if (viewerId) {
    isLiked = post.isLikedBy(viewerId);
    isBookmarked = await Bookmark.isBookmarked(viewerId, post._id);
  }

  return {
    ...post.toJSON(),
    isLiked,
    isBookmarked,
  };
};

/**
 * List posts with filtering, sorting, and pagination.
 */
export const list = async (filters = {}, viewerId = null) => {
  const {
    page = 1,
    limit = 20,
    tag,
    author,
    sort = "newest",
    status = "published",
  } = filters;

  const skip = (page - 1) * limit;
  const query = { status };

  if (tag) query.tags = tag;
  if (author) query.author = author;

  const sortOptions = {
    newest: { createdAt: -1 },
    popular: { likeCount: -1, createdAt: -1 },
    trending: { viewCount: -1, createdAt: -1 },
  };

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate("author", "name username headline avatar")
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(query),
  ]);

  // Add viewer-specific flags if viewerId is provided
  let enrichedPosts = posts;
  if (viewerId) {
    enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const isLiked = post.likes?.some((id) => id.equals(viewerId)) || false;
        const isBookmarked = await Bookmark.isBookmarked(viewerId, post._id);
        return {
          ...post,
          isLiked,
          isSaved: isBookmarked,
        };
      }),
    );
  }

  return {
    posts: enrichedPosts,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Toggle repost on a post.
 */
export const toggleRepost = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  const hasReposted = post.reposts.includes(userId);

  if (hasReposted) {
    // Remove repost
    post.reposts.pull(userId);
    post.repostCount = Math.max(0, post.repostCount - 1);
  } else {
    // Add repost
    post.reposts.push(userId);
    post.repostCount += 1;
  }

  await post.save();

  return {
    isReposted: !hasReposted,
    repostCount: post.repostCount,
  };
};

/**
 * Toggle like on a post.
 */
export const toggleLike = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound("Post not found");

  const alreadyLiked = post.likes.some((id) => id.equals(userId));

  if (alreadyLiked) {
    post.likes.pull(userId);
    post.likeCount = Math.max(0, post.likeCount - 1);
  } else {
    post.likes.addToSet(userId);
    post.likeCount += 1;
  }

  await post.save();

  // Notify post author when someone likes their post
  if (!alreadyLiked) {
    notifyPostLike(postId, post.author, userId);
  }

  return { liked: !alreadyLiked, likeCount: post.likeCount };
};

/**
 * Get posts by a specific user (for profile page).
 */
export const getByUser = async (
  username,
  page = 1,
  limit = 20,
  viewerId = null,
) => {
  const { User } = await import("../models/index.js");
  const user = await User.findOne({ username });
  if (!user) throw ApiError.notFound("User not found");

  const skip = (page - 1) * limit;
  const query = { author: user._id, status: "published" };

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate("author", "name username headline avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(query),
  ]);

  // Add viewer-specific flags if viewerId is provided
  let enrichedPosts = posts;
  if (viewerId) {
    enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const isLiked = post.likes?.some((id) => id.equals(viewerId)) || false;
        const isBookmarked = await Bookmark.isBookmarked(viewerId, post._id);
        return {
          ...post,
          isLiked,
          isSaved: isBookmarked,
        };
      }),
    );
  }

  return {
    posts: enrichedPosts,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Search posts by text.
 */
export const search = async (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const filter = {
    status: "published",
    $text: { $search: query },
  };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "name username headline avatar")
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(filter),
  ]);

  return {
    posts,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
