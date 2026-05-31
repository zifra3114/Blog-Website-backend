import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema, model } = mongoose;

// ─── Sub-schemas ───────────────────────────────────────────────

const imageSchema = new Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

// ─── Helpers ───────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Main schema ───────────────────────────────────────────────

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [300, 'Title must be at most 300 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [50, 'Content must be at least 50 characters'],
      maxlength: [50000, 'Content must be at most 50,000 characters'],
    },

    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt must be at most 500 characters'],
      default: '',
    },

    coverImage: {
      type: imageSchema,
      default: () => ({ url: '', publicId: '' }),
    },

    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: [30, 'Tag must be at most 30 characters'],
        },
      ],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'A post may have at most 10 tags',
      },
      default: [],
    },

    readTime: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: {
        values: ['draft', 'published'],
        message: 'Status must be draft or published',
      },
      default: 'draft',
    },

    likes: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],

    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookmarkCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    repostCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reposts: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],

    originalPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },

    isRepost: {
      type: Boolean,
      default: false,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// Feed: published posts sorted by newest
postSchema.index({ status: 1, createdAt: -1 });

// Author's posts
postSchema.index({ author: 1, status: 1, createdAt: -1 });

// Browse by tag
postSchema.index({ tags: 1, status: 1, createdAt: -1 });

// Trending
postSchema.index({ likeCount: -1, status: 1 });

// Full-text search (title weighted higher than content)
postSchema.index(
  { title: 'text', content: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, content: 1 } }
);

// ─── Virtuals ──────────────────────────────────────────────────

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

// ─── Middleware ─────────────────────────────────────────────────

// Generate slug, excerpt, read time, and publishedAt before saving
postSchema.pre('save', function (next) {
  // Generate slug from title (only for new documents or when title changes)
  if (this.isNew || this.isModified('title')) {
    const base = slugify(this.title, { lower: true, strict: true });
    // Use timestamp + random string for better uniqueness
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    this.slug = `${base}-${uniqueSuffix}`;
  }

  // Generate excerpt + read time from content
  if (this.isModified('content')) {
    const plainText = stripHtml(this.content);
    this.excerpt = plainText.length > 497
      ? plainText.substring(0, 497) + '...'
      : plainText;
    this.readTime = estimateReadTime(plainText);
  }

  // Set publishedAt when transitioning to published
  if (
    this.isModified('status') &&
    this.status === 'published' &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

// Cascade: remove comments and notifications when a post is deleted
postSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    const Comment = mongoose.model('Comment');
    const Notification = mongoose.model('Notification');

    await Promise.all([
      Comment.deleteMany({ post: this._id }),
      Notification.deleteMany({ post: this._id }),
    ]);
    next();
  }
);

// ─── Instance methods ──────────────────────────────────────────

postSchema.methods.isLikedBy = function (userId) {
  return this.likes.some((id) => id.equals(userId));
};

const Post = model('Post', postSchema);
export default Post;
