import { Comment, Post, Notification } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { notifyPostComment, notifyCommentReply, notifyCommentLike } from './notificationEmitter.js';

/**
 * Create a comment on a post.
 */
export const create = async (postId, authorId, content, parentCommentId = null) => {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  // Validate parent comment if replying
  let depth = 0;
  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId);
    if (!parent) throw ApiError.notFound('Parent comment not found');
    if (parent.post.toString() !== postId) {
      throw ApiError.badRequest('Parent comment does not belong to this post');
    }
    if (parent.depth >= 3) {
      throw ApiError.badRequest('Maximum nesting depth reached (3 levels)');
    }
    depth = parent.depth + 1;
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parentCommentId,
    depth,
  });

  // Send notification to post author (if not self-comment)
  if (!post.author.equals(authorId)) {
    notifyPostComment(postId, post.author, authorId, comment._id);
  }

  // If replying, also notify parent comment author
  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId);
    if (parent && !parent.author.equals(authorId) && !parent.author.equals(post.author)) {
      notifyCommentReply(postId, parent.author, authorId, comment._id);
    }
  }

  return comment.populate('author', 'name username headline avatar');
};

/**
 * Update a comment (owner only).
 */
export const update = async (commentId, userId, content) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  if (comment.author.toString() !== userId.toString()) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  comment.content = content;
  await comment.save();

  return comment.populate('author', 'name username headline avatar');
};

/**
 * Delete a comment (owner or admin).
 */
export const remove = async (commentId, userId, isAdmin = false) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  if (!isAdmin && comment.author.toString() !== userId.toString()) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await comment.deleteOne();
  return { deleted: true };
};

/**
 * List top-level comments for a post (paginated).
 */
export const listByPost = async (postId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ post: postId, parentComment: null })
      .populate('author', 'name username headline avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments({ post: postId, parentComment: null }),
  ]);

  return {
    comments,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * List replies to a comment.
 */
export const listReplies = async (commentId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [replies, total] = await Promise.all([
    Comment.find({ parentComment: commentId })
      .populate('author', 'name username headline avatar')
      .sort({ createdAt: 1 }) // oldest first for replies
      .skip(skip)
      .limit(limit),
    Comment.countDocuments({ parentComment: commentId }),
  ]);

  return {
    replies,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Toggle like on a comment.
 */
export const toggleLike = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const alreadyLiked = comment.likes.some((id) => id.equals(userId));

  if (alreadyLiked) {
    comment.likes.pull(userId);
    comment.likeCount = Math.max(0, comment.likeCount - 1);
  } else {
    comment.likes.addToSet(userId);
    comment.likeCount += 1;
  }

  await comment.save();

  // Notify comment author
  if (!alreadyLiked && !comment.author.equals(userId)) {
    notifyCommentLike(comment.post, comment.author, userId, comment._id);
  }

  return { liked: !alreadyLiked, likeCount: comment.likeCount };
};
