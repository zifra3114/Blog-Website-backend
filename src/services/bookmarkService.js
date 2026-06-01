import { Bookmark, Post } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Toggle bookmark on a post.
 */
export const toggleBookmark = async (userId, postId, note = '') => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  let isSaved = false;

  // ✅ FIXED: Agar custom static method .toggle model me na ho toh application crash hone se bacha li hai
  if (typeof Bookmark.toggle === 'function') {
    const result = await Bookmark.toggle(userId, postId, note);
    isSaved = result.bookmarked;
  } else {
    // Standard Mongoose implementation for manual toggle behavior fallback
    const existingBookmark = await Bookmark.findOne({ user: userId, post: postId });
    if (existingBookmark) {
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      isSaved = false;
    } else {
      await Bookmark.create({ user: userId, post: postId, note });
      isSaved = true;
    }
  }

  // Return format expected by frontend: { bookmarked, isSaved }
  return {
    bookmarked: isSaved,
    isSaved: isSaved,
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
  const posts = validBookmarks.map((b) => {
    const post = b.post;
    
    // ✅ FIXED: Safely comparing IDs via .toString() to prevent type crashes
    const isLiked = post.likes?.some((id) => id.toString() === userId.toString()) || false;

    return {
      ...post,
      isLiked,
      isSaved: true, // Always true since these are bookmarked posts
      isBookmarked: true, // Legacy field
      bookmarkNote: b.note,
      bookmarkCollection: b.collection,
    };
  });

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
  // ✅ FIXED: Handled fallback method mapping using standard distinct filter query
  if (typeof Bookmark.getCollections === 'function') {
    return await Bookmark.getCollections(userId);
  }
  
  // Standard extraction pattern if custom model helper is not defined
  const collections = await Bookmark.find({ user: userId, collection: { $ne: null } })
    .distinct('collection');
  return collections;
};

/**
 * Check if user has bookmarked a post.
 */
export const isBookmarked = async (userId, postId) => {
  if (typeof Bookmark.isBookmarked === 'function') {
    return await Bookmark.isBookmarked(userId, postId);
  }
  
  const exists = await Bookmark.findOne({ user: userId, post: postId });
  return !!exists;
};