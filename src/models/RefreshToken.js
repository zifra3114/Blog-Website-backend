import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────
//
// Refresh tokens are stored server-side so they can be:
//   - Revoked on logout (single session)
//   - Revoked on password change (all sessions)
//   - Rotated on each use (one-time use pattern)
//   - Audited with IP + user-agent for security

const refreshTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Refresh token must belong to a user'],
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

    // Security audit fields
    userAgent: {
      type: String,
      maxlength: 500,
      default: '',
    },

    ip: {
      type: String,
      maxlength: 45, // IPv6 max length
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────

// Look up tokens by user (for "logout all devices")
refreshTokenSchema.index({ user: 1 });

// TTL index: MongoDB automatically deletes expired tokens
refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// ─── Static methods ────────────────────────────────────────────

/**
 * Revoke a single refresh token (logout current device).
 */
refreshTokenSchema.statics.revoke = function (token) {
  return this.deleteOne({ token });
};

/**
 * Revoke all refresh tokens for a user (logout all devices,
 * force password change, account compromise).
 */
refreshTokenSchema.statics.revokeAllForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

/**
 * Find a valid (non-expired) token and populate the user.
 */
refreshTokenSchema.statics.findValid = function (token) {
  return this.findOne({
    token,
    expiresAt: { $gt: new Date() },
  }).populate('user');
};

const RefreshToken = model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
