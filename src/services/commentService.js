import { Comment, Post } from '../models/index.js';
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
  let parentCommentDoc = null; // ✅ Cache variable duplicate database queries se bachne ke liye

  if (parentCommentId) {
    parentCommentDoc = await Comment.findById(parentCommentId);
    if (!parentCommentDoc) throw ApiError.notFound('Parent comment not found');
    if (parentCommentDoc.post.toString() !== postId.toString()) {
      throw ApiError.badRequest('Parent comment does not belong to this post');
    }
    if (parentCommentDoc.depth >= 3) {
      throw ApiError.badRequest('Maximum nesting depth reached (3 levels)');
    }
    depth = parentCommentDoc.depth + 1;
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parentCommentId,
    depth,
  });

  // Send notification to post author (if not self-comment)
  // ✅ FIXED: Safe string comparison instead of unstable .equals()
  if (post.author.toString() !== authorId.toString()) {
    notifyPostComment(postId, post.author, authorId, comment._id);
  }

  // If replying, also notify parent comment author
  // ✅ FIXED PERFORMANCE: Dobara database hit karne ki zaroorat nahi, cached parentCommentDoc use kar rahe hain
  if (parentCommentId && parentCommentDoc) {
    const isParentAuthorSelf = parentCommentDoc.author.toString() === authorId.toString();
    const isParentAuthorPostAuthor = parentCommentDoc.author.toString() === post.author.toString();

    if (!isParentAuthorSelf && !isParentAuthorPostAuthor) {
      notifyCommentReply(postId, parentCommentDoc.author, authorId, comment._id);
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

  // ✅ FIXED: Using safe string verification for checking array elements
  const alreadyLiked = comment.likes.some((id) => id.toString() === userId.toString());

  if (alreadyLiked) {
    comment.likes.pull(userId);
    comment.likeCount = Math.max(0, comment.likeCount - 1);
  } else {
    comment.likes.addToSet(userId);
    comment.likeCount += 1;
  }

  await comment.save();

  // Notify comment author
  // ✅ FIXED: String check fallback logic
  if (!alreadyLiked && comment.author.toString() !== userId.toString()) {
    notifyCommentLike(comment.post, comment.author, userId, comment._id);
  }

  return { liked: !alreadyLiked, likeCount: comment.likeCount };
};