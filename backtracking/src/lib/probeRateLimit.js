// In-memory rate limiting and in-flight tracking for interactive blackbox probes.
// Protects reference solutions and the server from probe flooding.

const state = globalThis.__arenaProbeRateLimit ?? {
  lastProbe: new Map(), // key: `${userId}:${problemSlug}` -> timestamp
  inFlight: new Set(),  // key: userId
};
globalThis.__arenaProbeRateLimit = state;

export const claimProbeSlot = (userId, problemSlug, cooldownMs = 3000) => {
  if (state.inFlight.has(userId)) {
    return {
      allowed: false,
      message: 'Your previous probe is still running. Please wait.',
      waitMs: 1000,
    };
  }

  const key = `${userId}:${problemSlug}`;
  const last = state.lastProbe.get(key) ?? 0;
  const now = Date.now();
  const waitMs = last + cooldownMs - now;

  if (waitMs > 0) {
    const waitSec = Math.ceil(waitMs / 1000);
    return {
      allowed: false,
      message: `Cooldown active. Please wait ${waitSec}s before probing again.`,
      waitMs,
    };
  }

  state.inFlight.add(userId);
  return { allowed: true };
};

export const releaseProbeSlot = (userId, problemSlug) => {
  state.inFlight.delete(userId);
  const key = `${userId}:${problemSlug}`;
  state.lastProbe.set(key, Date.now());
};
