import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────
//
// Dedicated collection for bookmarks (saved posts).
// This avoids growing the Post or User documents and supports
// efficient paginated queries with cursor-based pagination.

const bookmarkSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Bookmark must belong to a user'],
    },

    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Bookmark must reference a post'],
    },

    // Optional user note — why they saved it
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note must be at most 500 characters'],
      default: '',
    },

    // Optional categorization (e.g., "read later", "reference")
    collection: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Collection name must be at most 50 characters'],
      default: 'default',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    suppressReservedKeysWarning: true, // 👈 Boss, yeh line add kar di hai taake warning gayab ho jaye!
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// One bookmark per user per post
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

// User's bookmarks feed (newest first)
bookmarkSchema.index({ user: 1, createdAt: -1 });

// User's bookmarks in a specific collection
bookmarkSchema.index({ user: 1, collection: 1, createdAt: -1 });

// Count bookmarks on a post
bookmarkSchema.index({ post: 1 });

// ─── Middleware ─────────────────────────────────────────────────

// After saving a bookmark, increment the post's bookmarkCount
bookmarkSchema.post('save', async function () {
  const Post = model('Post');
  await Post.findByIdAndUpdate(this.post, {
    $inc: { bookmarkCount: 1 },
  });
});

// After removing a bookmark, decrement the post's bookmarkCount
bookmarkSchema.post(
  'deleteOne',
  { document: true, query: false },
  async function () {
    const Post = model('Post');
    await Post.findByIdAndUpdate(this.post, {
      $inc: { bookmarkCount: -1 },
    });
  }
);

// ─── Static methods ────────────────────────────────────────────

/**
 * Toggle a bookmark: if it exists, remove it; if not, create it.
 * Returns { bookmarked: boolean, bookmark: Document|null }.
 */
bookmarkSchema.statics.toggle = async function (userId, postId, note = '') {
  const existing = await this.findOne({ user: userId, post: postId });

  if (existing) {
    await existing.deleteOne();
    return { bookmarked: false, bookmark: null };
  }

  const bookmark = await this.create({
    user: userId,
    post: postId,
    note,
  });
  return { bookmarked: true, bookmark };
};

/**
 * Check if a user has bookmarked a post.
 */
bookmarkSchema.statics.isBookmarked = async function (userId, postId) {
  const doc = await this.findOne({
    user: userId,
    post: postId,
  }).lean();
  return !!doc;
};

/**
 * Get all unique collection names for a user.
 */
bookmarkSchema.statics.getCollections = async function (userId) {
  return this.distinct('collection', { user: userId });
};

const Bookmark = model('Bookmark', bookmarkSchema);
export default Bookmark;