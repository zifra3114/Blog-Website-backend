import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ─── Main schema ───────────────────────────────────────────────
//
// Email verification tokens are stored server-side so they can be:
//   - Invalidated on resend (old tokens cleaned up)
//   - Auto-expired via TTL index (24 hours)
//   - Looked up by hashed token (prevents timing attacks if DB is compromised)

const emailVerificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Verification token must belong to a user'],
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

// Look up tokens by user (for invalidation on resend)
emailVerificationSchema.index({ user: 1 });

// TTL index: MongoDB automatically deletes expired tokens
emailVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// ─── Static methods ────────────────────────────────────────────

/**
 * Find a valid (non-expired) token and populate the user.
 */
emailVerificationSchema.statics.findValid = function (token) {
  return this.findOne({
    token,
    expiresAt: { $gt: new Date() },
  }).populate('user');
};

/**
 * Invalidate all verification tokens for a user (used before resending).
 */
emailVerificationSchema.statics.invalidateForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

const EmailVerification = model('EmailVerification', emailVerificationSchema);
export default EmailVerification;
