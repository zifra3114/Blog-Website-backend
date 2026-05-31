import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Comment must belong to a post'],
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author'],
    },

    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [5000, 'Comment must be at most 5,000 characters'],
    },

    // null = top-level comment; set = reply to another comment
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    likes: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],

    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Depth tracking — limits nesting to keep threads readable
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// Fetch comments for a post, oldest first
commentSchema.index({ post: 1, createdAt: 1 });

// Fetch replies to a specific comment
commentSchema.index({ parentComment: 1, createdAt: 1 });

// Author's comments
commentSchema.index({ author: 1, createdAt: -1 });

// Compound: top-level comments for a post (parentComment = null)
commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

// ─── Virtuals ──────────────────────────────────────────────────

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// ─── Middleware ─────────────────────────────────────────────────

// After saving a NEW comment, increment the post's commentCount
commentSchema.post('save', async function () {
  if (!this.isNew) return; // only count on creation, not edits
  const Post = mongoose.model('Post');
  await Post.findByIdAndUpdate(this.post, {
    $inc: { commentCount: 1 },
  });
});

// After removing a comment, decrement the post's commentCount
// and cascade-delete child replies
commentSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    const Post = mongoose.model('Post');

    // Decrement parent post's comment count
    await Post.findByIdAndUpdate(this.post, {
      $inc: { commentCount: -1 },
    });

    // Delete all direct replies (recursive cascade)
    const replies = await model('Comment').find({
      parentComment: this._id,
    });
    if (replies.length > 0) {
      await Promise.all(replies.map((reply) => reply.deleteOne()));
    }

    next();
  }
);

// Validate nesting depth when replying
commentSchema.pre('save', async function (next) {
  if (this.parentComment && this.isNew) {
    const parent = await model('Comment').findById(this.parentComment);
    if (!parent) {
      return next(new Error('Parent comment not found'));
    }
    if (parent.depth >= 3) {
      return next(
        new Error('Maximum nesting depth reached (3 levels)')
      );
    }
    this.depth = parent.depth + 1;
  }
  next();
});

// ─── Instance methods ──────────────────────────────────────────

commentSchema.methods.isLikedBy = function (userId) {
  return this.likes.some((id) => id.equals(userId));
};

const Comment = model('Comment', commentSchema);
export default Comment;
