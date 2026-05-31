import { Notification } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Get paginated notifications for a user.
 */
export const list = async (userId, page = 1, limit = 20, unreadOnly = false) => {
  const skip = (page - 1) * limit;
  const filter = { recipient: userId };
  if (unreadOnly) filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'name username avatar')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Mark a single notification as read.
 */
export const markRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) throw ApiError.notFound('Notification not found');

  notification.isRead = true;
  await notification.save();
  return notification;
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllRead = async (userId) => {
  const result = await Notification.markAllRead(userId);
  return { modifiedCount: result.modifiedCount };
};

/**
 * Get unread notification count.
 */
export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return count;
};
