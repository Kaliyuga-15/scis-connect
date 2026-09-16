import { ARENA_SOCKET_EVENTS } from './constants.js';
import { leaderboardFor } from './leaderboardService.js';

// server.js parks the Socket.IO namespace here so route handlers can broadcast
// without importing the server. When the module is loaded outside the custom
// server (a seed script, say) this is simply null and broadcasts no-op.
export const setArenaNamespace = (namespace) => {
  globalThis.__arenaNamespace = namespace;
};

export const arenaNamespace = () => globalThis.__arenaNamespace ?? null;

export const contestRoom = (contestKey) => `contest:${contestKey}`;
export const batchRoom = (contestKey, batch) => `contest:${contestKey}:batch:${batch}`;

const throttle = globalThis.__arenaBroadcastThrottle ?? { timers: new Map(), pending: new Map() };
globalThis.__arenaBroadcastThrottle = throttle;

const BROADCAST_INTERVAL_MS = 1500;

// During the closing minutes of a contest every accepted submission would
// otherwise trigger a full leaderboard recompute and fan-out. Collapsing them
// into at most one broadcast per interval keeps the standings live without
// melting the database.
export const broadcastLeaderboard = (contestKey, batch = null) => {
  if (!arenaNamespace()) return;

  const throttleKey = batch ? `${contestKey}:${batch}` : contestKey;

  if (throttle.timers.has(throttleKey)) {
    throttle.pending.set(throttleKey, true);
    return;
  }

  const emit = async () => {
    try {
      const rows = await leaderboardFor(contestKey, batch);
      // Broadcast to the contest room (all batches see this)
      arenaNamespace()?.to(contestRoom(contestKey)).emit(ARENA_SOCKET_EVENTS.LEADERBOARD_UPDATE, {
        rows,
        batch: batch || 'default',
      });
      // Also broadcast to the batch-specific room if applicable
      if (batch && batch !== 'default') {
        arenaNamespace()?.to(batchRoom(contestKey, batch)).emit(ARENA_SOCKET_EVENTS.LEADERBOARD_UPDATE, {
          rows,
          batch,
        });
      }
    } catch (err) {
      console.error('[arena realtime] leaderboard broadcast failed', err);
    }
  };

  emit();

  throttle.timers.set(
    throttleKey,
    setTimeout(() => {
      throttle.timers.delete(throttleKey);
      if (throttle.pending.delete(throttleKey)) broadcastLeaderboard(contestKey, batch);
    }, BROADCAST_INTERVAL_MS)
  );
};

export const broadcastContestState = (contest) => {
  arenaNamespace()
    ?.to(contestRoom(contest.key))
    .emit(ARENA_SOCKET_EVENTS.CONTEST_STATE, contest.toStatePayload());
};
