import { Notification } from "../models/index.js";
import {
  emitToUser,
  isUserOnline,
} from "../../../Blog-backend/src/config/socket.js";
import logger from "../../../Blog-backend/src/config/logger.js";

/**
 * Create a notification and emit it via Socket.io if the user is online.
 * Skips self-notifications and duplicate unread notifications.
 */
export const notify = async (data) => {
  try {
    // Don't notify yourself
    if (data.sender.toString() === data.recipient.toString()) return null;

    const notification = await Notification.createIfNotExists(data);
    if (!notification) return null;

    // Populate sender info for the real-time event
    await notification.populate("sender", "name username avatar");
    if (notification.post) {
      await notification.populate("post", "title slug");
    }

    // Emit to user if they're online
    if (isUserOnline(data.recipient)) {
      emitToUser(data.recipient, "notification:new", {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        sender: notification.sender,
        post: notification.post,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      // Also emit updated unread count
      const count = await Notification.countDocuments({
        recipient: data.recipient,
        isRead: false,
      });
      emitToUser(data.recipient, "notification:unread-count", { count });
    }

    return notification;
  } catch (err) {
    // Log but don't throw — notification failures shouldn't break the main action
    logger.error("Failed to create notification:", {
      message: err.message,
      data,
    });
    return null;
  }
};

/**
 * Notify when someone likes a post.
 */
export const notifyPostLike = async (postId, postAuthorId, likerId) => {
  return notify({
    recipient: postAuthorId,
    sender: likerId,
    type: "like",
    post: postId,
  });
};

/**
 * Notify when someone comments on a post.
 */
export const notifyPostComment = async (
  postId,
  postAuthorId,
  commenterId,
  commentId,
) => {
  return notify({
    recipient: postAuthorId,
    sender: commenterId,
    type: "comment",
    post: postId,
    comment: commentId,
  });
};

/**
 * Notify when someone replies to a comment.
 */
export const notifyCommentReply = async (
  postId,
  parentCommentAuthorId,
  replierId,
  commentId,
) => {
  return notify({
    recipient: parentCommentAuthorId,
    sender: replierId,
    type: "reply",
    post: postId,
    comment: commentId,
  });
};

/**
 * Notify when someone likes a comment.
 */
export const notifyCommentLike = async (
  postId,
  commentAuthorId,
  likerId,
  commentId,
) => {
  return notify({
    recipient: commentAuthorId,
    sender: likerId,
    type: "like",
    post: postId,
    comment: commentId,
  });
};

/**
 * Notify when someone follows you.
 */
export const notifyFollow = async (followerId, followedUserId) => {
  return notify({
    recipient: followedUserId,
    sender: followerId,
    type: "follow",
  });
};

/**
 * Notify all followers when a new blog is published.
 */
export const notifyNewBlog = async (postId, authorId) => {
  try {
    // Import here to avoid circular dependency
    const { Follow } = await import("../models/index.js");

    // Get all followers of the author
    const follows = await Follow.find({ following: authorId }).select(
      "follower",
    );
    const followerIds = follows.map((f) => f.follower);

    if (followerIds.length === 0) return;

    // Create notifications for all followers
    const promises = followerIds.map((followerId) =>
      notify({
        recipient: followerId,
        sender: authorId,
        type: "new_post",
        post: postId,
        message: "published a new post",
      }),
    );

    await Promise.allSettled(promises);
  } catch (err) {
    logger.error("Failed to notify followers of new blog:", {
      message: err.message,
      postId,
      authorId,
    });
  }
};
