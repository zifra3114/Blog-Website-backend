import { Notification } from "../models/index.js";
// ✅ FIXED PATHS: Project folder structure ke mutabiq imports sahi kar diye hain
import { emitToUser, isUserOnline } from "../config/socket.js";
import logger from "../config/logger.js";

/**
 * Create a notification and emit it via Socket.io if the user is online.
 * Skips self-notifications and duplicate unread notifications.
 */
export const notify = async (data) => {
  try {
    // Don't notify yourself
    if (data.sender.toString() === data.recipient.toString()) return null;

    // ✅ FIXED: Safe handling if custom statics method isn't explicitly defined in model
    let notification;
    if (typeof Notification.createIfNotExists === "function") {
      notification = await Notification.createIfNotExists(data);
    } else {
      // Fallback behavior to prevent crash
      const existing = await Notification.findOne({
        recipient: data.recipient,
        sender: data.sender,
        type: data.type,
        post: data.post || null,
        isRead: false
      });
      if (existing) return null;
      notification = await Notification.create(data);
    }

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
    const { Follow } = await import("../models/index.js");

    // Get all followers of the author
    const follows = await Follow.find({ following: authorId }).select("follower");
    const followerIds = follows.map((f) => f.follower);

    if (followerIds.length === 0) return;

    // ✅ OPTIMIZATION: Instead of map loop with await inside, we break batch or let it process cleanly 
    // using Promise.all without choking the event loop on large counts.
    // Production architecture recommendation: complex notification features should ideally go to a queue (like BullMQ),
    // but for now, executing them in parallel smoothly:
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