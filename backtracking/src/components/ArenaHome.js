'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useArena } from '@/hooks/useArena';
import { currentUser } from '@/lib/identity';
import { apiFetch } from '@/lib/apiClient';
import { CONTEST_STATUS } from '@/lib/constants';
import ContestTimer from './ContestTimer';
import ArenaLeaderboard from './ArenaLeaderboard';

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  hard: 'bg-red-500/15 text-red-300 border-red-400/30',
};

const DIFFICULTY_BORDER = {
  easy: 'border-emerald-400/20 hover:border-emerald-400/50',
  medium: 'border-amber-400/20 hover:border-amber-400/50',
  hard: 'border-red-400/20 hover:border-red-400/50',
};

export default function ArenaHome({ contestKey, problems }) {
  const { contest, leaderboard, error } = useArena(contestKey);
  const [signedIn, setSignedIn] = useState(false);
  const [mySubmissions, setMySubmissions] = useState([]);

  useEffect(() => {
    setSignedIn(Boolean(currentUser()));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    apiFetch(`/api/arena/submissions?key=${encodeURIComponent(contestKey)}`)
      .then(setMySubmissions)
      .catch(() => setMySubmissions([]));
  }, [signedIn, contestKey, leaderboard]);

  // Best score per problem, so each card can show progress at a glance.
  const bestByProblem = mySubmissions.reduce((acc, submission) => {
    const current = acc[submission.problemSlug];
    if (!current || submission.score > current.score) acc[submission.problemSlug] = submission;
    return acc;
  }, {});

  // Filter problems based on contest's assigned problemSlugs (batch isolation)
  const visibleProblems =
    contest?.problemSlugs && contest.problemSlugs.length > 0
      ? problems.filter((p) => contest.problemSlugs.includes(p.slug))
      : problems;

  const notStarted = contest?.status === CONTEST_STATUS.SCHEDULED;
  const isLive = contest?.status === CONTEST_STATUS.RUNNING;

  return (
    <div className="space-y-8">
      {/* Contest banner */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-wider text-indigo-300/70">Level 2</p>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span className="text-xs font-medium text-emerald-300">LIVE</span>
              </div>
            )}
            {contest?.batch && contest.batch !== 'default' && (
              <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                {contest.batch}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-3xl font-bold">{contest?.title ?? 'Backtracking'}</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Probe the black box with your own inputs, deduce the pattern, and write the C code that
            reproduces it.
          </p>
        </div>
        <ContestTimer contest={contest} />
      </section>

      {error ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      ) : null}

      {!signedIn ? (
        <p className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
          Enter your name in the top right to start.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Problems</h2>

        {visibleProblems.length === 0 ? (
          <p className="text-white/50">
            No published problems. Run <code className="text-indigo-300">npm run seed:problems</code>.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleProblems.map((problem) => {
              const best = bestByProblem[problem.slug];
              const solved = best?.score >= problem.points;
              const diff = problem.difficulty || 'medium';
              const passRate = best
                ? Math.round((best.passed / Math.max(best.total, 1)) * 100)
                : 0;

              return (
                <li key={problem.slug} className="card-enter">
                  <Link
                    href={`/arena/${problem.slug}`}
                    className={`glass-card block h-full rounded-xl border p-4 transition ${
                      solved
                        ? 'border-emerald-400/30 bg-emerald-500/[0.07] hover:border-emerald-400/60'
                        : DIFFICULTY_BORDER[diff] || 'border-white/10 hover:border-indigo-400/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{problem.title}</span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.medium
                          }`}
                        >
                          {diff}
                        </span>
                      </div>
                      <span className="mono shrink-0 text-xs tabular-nums text-white/40">
                        {problem.points} pts
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      {best ? (
                        <>
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              solved
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'bg-amber-500/15 text-amber-200'
                            }`}
                          >
                            {solved ? '✓ Solved' : `${best.passed}/${best.total} tests`}
                          </span>
                          {/* Progress ring */}
                          {!solved && (
                            <svg width="20" height="20" className="shrink-0">
                              <circle
                                cx="10" cy="10" r="8"
                                fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="2"
                              />
                              <circle
                                cx="10" cy="10" r="8"
                                fill="none" stroke="rgb(245 158 11 / 0.6)" strokeWidth="2"
                                strokeDasharray={`${(passRate / 100) * 50.2} 50.2`}
                                strokeLinecap="round"
                                transform="rotate(-90 10 10)"
                              />
                            </svg>
                          )}
                        </>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/40">
                          Not attempted
                        </span>
                      )}
                      <span className="text-white/30">{problem.timeLimitMs}ms limit</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Standings</h2>
          {notStarted ? <span className="text-xs text-white/40">Contest not started</span> : null}
        </div>
        <ArenaLeaderboard rows={leaderboard} problems={visibleProblems} />
      </section>
    </div>
  );
}
