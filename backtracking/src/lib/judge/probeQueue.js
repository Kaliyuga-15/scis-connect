// Dedicated queue for interactive black-box probe executions.
// Kept separate from the main submission judge queue so high probe traffic
// cannot starve official contest submissions.

const DEFAULT_PROBE_CONCURRENCY = 2;

const state = globalThis.__arenaProbeQueue ?? {
  active: 0,
  pending: [],
};
globalThis.__arenaProbeQueue = state;

const pump = () => {
  const limit = DEFAULT_PROBE_CONCURRENCY;
  while (state.active < limit && state.pending.length > 0) {
    const job = state.pending.shift();
    state.active += 1;
    job
      .task()
      .then(job.resolve, job.reject)
      .finally(() => {
        state.active -= 1;
        pump();
      });
  }
};

export const enqueueProbe = (task) =>
  new Promise((resolve, reject) => {
    state.pending.push({ task, resolve, reject });
    pump();
  });

export const probeQueueDepth = () => ({
  active: state.active,
  waiting: state.pending.length,
});
