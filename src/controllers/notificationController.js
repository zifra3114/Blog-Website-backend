import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as notificationService from '../services/notificationService.js';

/**
 * GET /notifications
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, unread } = req.query;
  const result = await notificationService.list(
    req.user._id,
    parseInt(page) || 1,
    parseInt(limit) || 20,
    unread === 'true'
  );
  res.json(
    ApiResponse.paginated(result.notifications, {
      ...result.meta,
      unreadCount: result.unreadCount,
    })
  );
});

/**
 * PATCH /notifications/:id/read
 */
export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.params.id,
    req.user._id
  );
  res.json(ApiResponse.ok(notification, 'Notification marked as read'));
});

/**
 * PATCH /notifications/read-all
 */
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user._id);
  res.json(ApiResponse.ok(result, 'All notifications marked as read'));
});

/**
 * GET /notifications/unread-count
 */
export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json(ApiResponse.ok({ count }));
});
