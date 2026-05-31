import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Constants ─────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  'like',       // someone liked your post/comment
  'comment',    // someone commented on your post
  'follow',     // someone followed you
  'mention',    // someone mentioned you in a post/comment
  'reply',      // someone replied to your comment
  'new_post',   // someone you follow published a new post
];

// ─── Main schema ───────────────────────────────────────────────

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a sender'],
    },

    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: `Type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
      },
      required: [true, 'Notification type is required'],
    },

    // Optional references — populated based on notification type
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },

    comment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    message: {
      type: String,
      maxlength: [500, 'Message must be at most 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// User's notification feed
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Unread notifications for badge count
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Prevent duplicate notifications (same event, same recipient, same sender)
notificationSchema.index(
  { recipient: 1, sender: 1, type: 1, post: 1, comment: 1 },
  { unique: true, partialFilterExpression: { isRead: false } }
);

// Auto-expire old notifications after 90 days (TTL index)
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// ─── Middleware ─────────────────────────────────────────────────

// Don't create a notification if sender === recipient (no self-notifications)
notificationSchema.pre('save', function (next) {
  if (this.sender.equals(this.recipient)) {
    return next(new Error('Cannot send notification to yourself'));
  }
  next();
});

// Generate a human-readable message if not provided
notificationSchema.pre('save', function (next) {
  if (this.message) return next();

  const messages = {
    like: 'liked your post',
    comment: 'commented on your post',
    follow: 'started following you',
    mention: 'mentioned you',
    reply: 'replied to your comment',
    new_post: 'published a new post',
  };

  this.message = messages[this.type] || '';
  next();
});

// ─── Static methods ────────────────────────────────────────────

/**
 * Create a notification, but skip if it's a self-action
 * or if an identical unread notification already exists.
 */
notificationSchema.statics.createIfNotExists = async function (data) {
  if (data.sender.toString() === data.recipient.toString()) return null;

  const existing = await this.findOne({
    recipient: data.recipient,
    sender: data.sender,
    type: data.type,
    post: data.post || null,
    comment: data.comment || null,
    isRead: false,
  });

  if (existing) return existing;
  return this.create(data);
};

/**
 * Mark all unread notifications as read for a user.
 */
notificationSchema.statics.markAllRead = function (recipientId) {
  return this.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true } }
  );
};

// ─── Instance methods ──────────────────────────────────────────

notificationSchema.methods.markRead = function () {
  this.isRead = true;
  return this.save();
};

const Notification = model('Notification', notificationSchema);
export default Notification;
