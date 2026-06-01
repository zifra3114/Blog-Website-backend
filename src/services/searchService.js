import { Post, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Search both posts and users.
 */
export const searchAll = async (query, page = 1, limit = 20) => {
  if (!query || query.trim().length < 2) {
    throw ApiError.badRequest('Search query must be at least 2 characters');
  }

  const skip = (page - 1) * limit;

  // ✅ FIXED: Escape special characters to prevent regex injection crashes
  const escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'i');

  const [posts, users, postTotal, userTotal] = await Promise.all([
    // 1. Fetch Matches from Posts
    Post.find({
      status: 'published',
      $or: [
        { title: regex },
        { tags: regex }, // ✅ FIXED: Tags par bhi partial regex match lagaya taake 'java' search karne par 'javascript' ka tag mil sake
      ],
    })
      .populate('author', 'name username headline avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    // 2. Fetch Matches from Users
    User.find({
      isActive: true,
      $or: [{ name: regex }, { username: regex }],
    })
      .select('name username headline avatar followerCount')
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    // 3. Count Total Matching Posts
    Post.countDocuments({
      status: 'published',
      $or: [
        { title: regex },
        { tags: regex }, // ✅ FIXED: Count me bhi same tag logic apply kiya
      ],
    }),

    // 4. Count Total Matching Users
    User.countDocuments({
      isActive: true,
      $or: [{ name: regex }, { username: regex }],
    }),
  ]);

  return {
    posts,
    users,
    meta: {
      page,
      limit,
      postTotal,
      userTotal,
      postTotalPages: Math.ceil(postTotal / limit),
      userTotalPages: Math.ceil(userTotal / limit),
    },
  };
};