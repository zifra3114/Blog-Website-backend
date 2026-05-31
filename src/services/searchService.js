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
  const regex = new RegExp(query, 'i');

  const [posts, users, postTotal, userTotal] = await Promise.all([
    Post.find({
      status: 'published',
      $or: [
        { title: regex },
        { tags: { $in: [query.toLowerCase()] } },
      ],
    })
      .populate('author', 'name username headline avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.find({
      isActive: true,
      $or: [{ name: regex }, { username: regex }],
    })
      .select('name username headline avatar followerCount')
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Post.countDocuments({
      status: 'published',
      $or: [
        { title: regex },
        { tags: { $in: [query.toLowerCase()] } },
      ],
    }),

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
