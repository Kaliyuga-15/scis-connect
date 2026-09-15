import mongoose from 'mongoose';

// Ephemeral log of interactive blackbox probes.
// Used for rate-limiting, usage quotas (maxProbes per problem), and audit/analytics.
// Automatically expires after 24 hours via TTL index.

const probeLogSchema = new mongoose.Schema(
  {
    contestKey: { type: String, required: true, index: true },
    batch: { type: String, default: 'default', index: true },
    userId: { type: String, required: true, index: true },
    problemSlug: { type: String, required: true, index: true },
    input: { type: String, required: true },
    output: { type: String, default: '' },
    status: { type: String, enum: ['success', 'error', 'timeout', 'invalid_input'], default: 'success' },
    durationMs: { type: Number, default: 0 },
    createdAt: {
      type: Date,
      default: Date.now,
      // 24 hours TTL
      expires: 86400,
    },
  },
  { timestamps: false }
);

probeLogSchema.index({ contestKey: 1, userId: 1, problemSlug: 1, createdAt: -1 });

export const ProbeLog =
  mongoose.models.ProbeLog || mongoose.model('ProbeLog', probeLogSchema);
