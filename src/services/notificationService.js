import { Notification } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Get paginated notifications for a user.
 */
export const list = async (userId, page = 1, limit = 20, unreadOnly = false) => {
  const skip = (page - 1) * limit;
  const filter = { recipient: userId };
  if (unreadOnly) filter.isRead = false;

  // ✅ OPTIMIZATION: Unread count query ko check ke sath streamline kiya hai
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'name username avatar')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    unreadOnly 
      ? Notification.countDocuments({ recipient: userId, isRead: false }) // Agar list unread ki hai toh double query bachegi
      : null 
  ]);

  // Agar unreadOnly false tha, toh alag se final count nikalne ki zaroorat nahi agar hum upar skip kar chuke hain, 
  // ya fir direct safe method se database se fetch kar lenge jo getUnreadCount me hai.
  const finalUnreadCount = unreadOnly ? total : (await getUnreadCount(userId));

  return {
    notifications,
    unreadCount: finalUnreadCount,
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
  // ✅ FIXED: Custom model function crash se bachne ke liye standard Mongoose updateMany use kiya hai
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );
  
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