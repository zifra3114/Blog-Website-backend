import { User, Follow } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import pick from '../utils/pick.js';
import { notifyFollow } from './notificationEmitter.js';

/**
 * Get a public user profile by username.
 */
export const getByUsername = async (username) => {
  const user = await User.findOne({ username, isActive: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

/**
 * Get a user profile with follow status (for authenticated requests).
 */
export const getProfile = async (username, currentUserId) => {
  const user = await getByUsername(username);

  let isFollowing = false;
  if (currentUserId && !currentUserId.equals(user._id)) {
    isFollowing = await Follow.isFollowing(currentUserId, user._id);
  }

  return {
    ...user.toJSON(),
    isFollowing,
  };
};

/**
 * Update the current user's profile.
 */
export const updateProfile = async (userId, updates) => {
  const allowed = pick(updates, [
    'name',
    'headline',
    'bio',
    'location',
    'website',
    'skills',
    'avatar',
    'coverImage',
    'socialLinks',
    'experience',
    'education',
  ]);

  // Check username uniqueness if changing
  if (updates.username && updates.username !== '') {
    const existing = await User.findOne({
      username: updates.username,
      _id: { $ne: userId },
    });
    if (existing) throw ApiError.conflict('Username is already taken');
    allowed.username = updates.username;
  }

  // Ensure nested objects are properly set
  if (updates.avatar !== undefined) {
    allowed.avatar = updates.avatar;
  }
  if (updates.coverImage !== undefined) {
    allowed.coverImage = updates.coverImage;
  }
  if (updates.socialLinks !== undefined) {
    allowed.socialLinks = updates.socialLinks;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: allowed },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) throw ApiError.notFound('User not found');
  return user;
};

/**
 * Update avatar or cover image.
 */
export const updateImage = async (userId, field, imageData) => {
  const allowedFields = ['avatar', 'coverImage'];
  if (!allowedFields.includes(field)) {
    throw ApiError.badRequest(`Invalid field: ${field}`);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { [field]: imageData },
    { new: true }
  );

  if (!user) throw ApiError.notFound('User not found');
  return user[field];
};

/**
 * Toggle follow/unfollow another user.
 */
export const toggleFollow = async (followerId, targetUserId) => {
  if (followerId.equals(targetUserId)) {
    throw ApiError.badRequest('You cannot follow yourself');
  }

  const target = await User.findById(targetUserId);
  if (!target) throw ApiError.notFound('User not found');

  const result = await Follow.toggle(followerId, targetUserId);

  // Notify the followed user
  if (result.followed) {
    notifyFollow(followerId, targetUserId);
  }

  return result;
};

/**
 * Get paginated followers list.
 */
export const getFollowers = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [followers, total] = await Promise.all([
    Follow.find({ following: userId })
      .populate('follower', 'name username headline avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Follow.countDocuments({ following: userId }),
  ]);

  return {
    users: followers.map((f) => f.follower),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Get paginated following list.
 */
export const getFollowing = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [following, total] = await Promise.all([
    Follow.find({ follower: userId })
      .populate('following', 'name username headline avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Follow.countDocuments({ follower: userId }),
  ]);

  return {
    users: following.map((f) => f.following),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Search users by name or username.
 */
export const searchUsers = async (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const regex = new RegExp(query, 'i');

  const filter = {
    isActive: true,
    $or: [{ name: regex }, { username: regex }],
  };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name username headline avatar followerCount')
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
