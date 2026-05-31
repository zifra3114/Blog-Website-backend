import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────
//
// The Follow model is a dedicated edge collection for the social graph.
// While User.followers/following arrays work for small datasets,
// a separate collection scales to millions of follow relationships
// without bloating user documents or hitting the 16 MB BSON limit.
//
// User.followers/following arrays are kept in sync via middleware
// for fast reads (profile pages), but this collection is the
// source of truth for follow queries.

const followSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Follower is required'],
    },

    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Following target is required'],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// Prevent duplicate follow edges
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// "Who does X follow?" — following list
followSchema.index({ follower: 1, createdAt: -1 });

// "Who follows X?" — followers list
followSchema.index({ following: 1, createdAt: -1 });

// Mutual followers query optimization
followSchema.index({ following: 1, follower: 1 });

// ─── Middleware ─────────────────────────────────────────────────

// After creating a follow, update both users' arrays and counts
followSchema.post('save', async function () {
  const User = model('User');

  await Promise.all([
    User.findByIdAndUpdate(this.follower, {
      $addToSet: { following: this.following },
      $inc: { followingCount: 1 },
    }),
    User.findByIdAndUpdate(this.following, {
      $addToSet: { followers: this.follower },
      $inc: { followerCount: 1 },
    }),
  ]);
});

// After removing a follow, update both users' arrays and counts
followSchema.post(
  'deleteOne',
  { document: true, query: false },
  async function () {
    const User = model('User');

    await Promise.all([
      User.findByIdAndUpdate(this.follower, {
        $pull: { following: this.following },
        $inc: { followingCount: -1 },
      }),
      User.findByIdAndUpdate(this.following, {
        $pull: { followers: this.follower },
        $inc: { followerCount: -1 },
      }),
    ]);
  }
);

// ─── Validation ────────────────────────────────────────────────

// Prevent self-follow
followSchema.pre('save', function (next) {
  if (this.follower.equals(this.following)) {
    return next(new Error('You cannot follow yourself'));
  }
  next();
});

// ─── Static methods ────────────────────────────────────────────

followSchema.statics.isFollowing = async function (followerId, followingId) {
  const doc = await this.findOne({
    follower: followerId,
    following: followingId,
  }).lean();
  return !!doc;
};

followSchema.statics.toggle = async function (followerId, followingId) {
  const existing = await this.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existing) {
    await existing.deleteOne();
    return { followed: false };
  }

  await this.create({
    follower: followerId,
    following: followingId,
  });
  return { followed: true };
};

const Follow = model('Follow', followSchema);
export default Follow;
