import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────
//
// Password reset tokens are stored server-side so they can be:
//   - Invalidated after use (one-time use)
//   - Auto-expired via TTL index (1 hour)
//   - Looked up by hashed token (prevents timing attacks if DB is compromised)

const passwordResetSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reset token must belong to a user'],
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// Look up tokens by user (for invalidation)
passwordResetSchema.index({ user: 1 });

// TTL index: MongoDB automatically deletes expired tokens
passwordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// ─── Static methods ────────────────────────────────────────────

/**
 * Find a valid (non-expired) token and populate the user.
 */
passwordResetSchema.statics.findValid = function (token) {
  return this.findOne({
    token,
    expiresAt: { $gt: new Date() },
  }).populate('user');
};

/**
 * Invalidate all reset tokens for a user (used before creating new one).
 */
passwordResetSchema.statics.invalidateForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

const PasswordReset = model('PasswordReset', passwordResetSchema);
export default PasswordReset;
