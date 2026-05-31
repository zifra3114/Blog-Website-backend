import { Bookmark, Post } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Toggle bookmark on a post.
 */
export const toggleBookmark = async (userId, postId, note = '') => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  const result = await Bookmark.toggle(userId, postId, note);

  // Return format expected by frontend: { bookmarked, isSaved }
  return {
    bookmarked: result.bookmarked,
    isSaved: result.bookmarked,
  };
};

/**
 * Get user's bookmarked posts with pagination.
 */
export const getUserBookmarks = async (userId, page = 1, limit = 20, collection = null) => {
  const skip = (page - 1) * limit;
  const query = { user: userId };

  if (collection) {
    query.collection = collection;
  }

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(query)
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'name username headline avatar',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bookmark.countDocuments(query),
  ]);

  // Filter out bookmarks where post was deleted
  const validBookmarks = bookmarks.filter((b) => b.post);

  // Extract posts from bookmarks and add viewer-specific flags
  const posts = await Promise.all(
    validBookmarks.map(async (b) => {
      const post = b.post;
      const isLiked = post.likes?.some((id) => id.equals(userId)) || false;

      return {
        ...post,
        isLiked,
        isSaved: true, // Always true since these are bookmarked posts
        isBookmarked: true, // Legacy field
        bookmarkNote: b.note,
        bookmarkCollection: b.collection,
      };
    })
  );

  return {
    posts,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user's bookmark collections.
 */
export const getUserCollections = async (userId) => {
  const collections = await Bookmark.getCollections(userId);
  return collections;
};

/**
 * Check if user has bookmarked a post.
 */
export const isBookmarked = async (userId, postId) => {
  return await Bookmark.isBookmarked(userId, postId);
};
