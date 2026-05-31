import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

// ─── Sub-schemas ───────────────────────────────────────────────
const imageSchema = new Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

// ─── Main schema ───────────────────────────────────────────────
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username may only contain letters, numbers, and underscores',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [220, 'Headline must be at most 220 characters'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, 'Bio must be at most 2000 characters'],
      default: '',
    },
    avatar: {
      type: imageSchema,
      default: () => ({ url: '', publicId: '' }),
    },
    coverImage: {
      type: imageSchema,
      default: () => ({ url: '', publicId: '' }),
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location must be at most 100 characters'],
      default: '',
    },
    website: {
      type: String,
      trim: true,
      maxlength: [300, 'Website URL must be at most 300 characters'],
      default: '',
    },
    skills: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      validate: {
        validator: (v) => v.length <= 30,
        message: 'A user may have at most 30 skills',
      },
      default: [],
    },
    socialLinks: {
      type: {
        twitter: { type: String, trim: true, maxlength: 300, default: '' },
        linkedin: { type: String, trim: true, maxlength: 300, default: '' },
        github: { type: String, trim: true, maxlength: 300, default: '' },
        facebook: { type: String, trim: true, maxlength: 300, default: '' },
        instagram: { type: String, trim: true, maxlength: 300, default: '' },
        youtube: { type: String, trim: true, maxlength: 300, default: '' },
      },
      default: () => ({
        twitter: '',
        linkedin: '',
        github: '',
        facebook: '',
        instagram: '',
        youtube: '',
      }),
    },
    experience: [
      {
        title: { type: String, trim: true, maxlength: 200 },
        company: { type: String, trim: true, maxlength: 200 },
        location: { type: String, trim: true, maxlength: 100 },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true, maxlength: 2000 },
      },
    ],
    education: [
      {
        school: { type: String, trim: true, maxlength: 200 },
        degree: { type: String, trim: true, maxlength: 200 },
        field: { type: String, trim: true, maxlength: 200 },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true, maxlength: 2000 },
      },
    ],
    followers: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],
    following: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],
    followerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be user or admin',
      },
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true, // 👈 WARNING KO OFF KARNE KE LIYE
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────
userSchema.index({ name: 'text', headline: 'text', bio: 'text' });
userSchema.index({ followerCount: -1 });
userSchema.index({ isActive: 1, createdAt: -1 });

// ─── Virtuals ──────────────────────────────────────────────────
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
});

userSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

// ─── Middleware ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    const Post = mongoose.model('Post');
    const Comment = mongoose.model('Comment');
    const Notification = mongoose.model('Notification');

    await Promise.all([
      Post.deleteMany({ author: this._id }),
      Comment.deleteMany({ author: this._id }),
      Notification.deleteMany({
        $or: [{ recipient: this._id }, { sender: this._id }],
      }),
    ]);
    next();
  }
);

// ─── Instance methods ──────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isFollowing = function (userId) {
  return this.following.some((id) => id.equals(userId));
};

const User = model('User', userSchema);
export default User;