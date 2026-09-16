'use client';

import { currentUser } from '@/lib/identity';
import { useEffect, useState } from 'react';

const RANK_CLASSES = {
  1: 'leaderboard-gold',
  2: 'leaderboard-silver',
  3: 'leaderboard-bronze',
};

const RANK_LABELS = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export default function ArenaLeaderboard({
  rows,
  problems = [],
  compact = false,
  batches = [],
  activeBatch = null,
  onBatchChange = null,
}) {
  const [meId, setMeId] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    setMeId(currentUser()?.userId ?? null);
  }, []);

  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-sm text-white/40">No submissions yet.</p>
      </div>
    );
  }

  // Compute stats
  const totalParticipants = rows.length;
  const avgScore =
    totalParticipants > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.totalScore, 0) / totalParticipants)
      : 0;
  const sortedScores = rows.map((r) => r.totalScore).sort((a, b) => a - b);
  const medianScore =
    totalParticipants > 0
      ? sortedScores[Math.floor(totalParticipants / 2)]
      : 0;

  // Find me row for pinning
  const myRow = rows.find((r) => r.userId === meId);

  return (
    <div className="space-y-3">
      {/* Batch tabs */}
      {batches.length > 1 && onBatchChange && (
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {batches.map((b) => (
            <button
              key={b}
              onClick={() => onBatchChange(b)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                b === activeBatch
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 text-xs text-white/40">
        <span>
          <span className="text-white/60">{totalParticipants}</span> contestants
        </span>
        <span>
          Avg: <span className="mono tabular-nums text-white/60">{avgScore}</span>
        </span>
        <span>
          Median: <span className="mono tabular-nums text-white/60">{medianScore}</span>
        </span>
      </div>

      {/* Table */}
      <div className="scroll-thin overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Contestant</th>
              {!compact &&
                problems.map((problem) => (
                  <th key={problem.slug} className="px-3 py-2 text-center font-medium">
                    {problem.order || problem.slug}
                  </th>
                ))}
              <th className="px-3 py-2 text-right font-medium">Solved</th>
              <th className="px-3 py-2 text-right font-medium">Attempts</th>
              <th className="px-3 py-2 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMe = row.userId === meId;
              const rankClass = RANK_CLASSES[row.rank] || '';
              const isExpanded = expandedUser === row.userId;

              return (
                <>
                  <tr
                    key={row.userId}
                    onClick={() => setExpandedUser(isExpanded ? null : row.userId)}
                    className={`cursor-pointer border-b border-white/5 last:border-0 transition ${rankClass} ${
                      isMe ? 'bg-indigo-500/10' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="mono px-3 py-2 tabular-nums text-white/40">
                      {RANK_LABELS[row.rank] || row.rank}
                    </td>
                    <td className="px-3 py-2">
                      <span className={isMe ? 'font-medium text-indigo-200' : 'text-white/80'}>
                        {row.name}
                      </span>
                      {isMe ? <span className="ml-2 text-xs text-indigo-300/70">you</span> : null}
                    </td>
                    {!compact &&
                      problems.map((problem) => {
                        const score = row.perProblem?.[problem.slug];
                        return (
                          <td
                            key={problem.slug}
                            className="mono px-3 py-2 text-center text-xs tabular-nums"
                          >
                            {score === undefined ? (
                              <span className="text-white/15">-</span>
                            ) : (
                              <span
                                className={
                                  score >= problem.points ? 'text-emerald-300' : 'text-amber-300/80'
                                }
                              >
                                {score}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    <td className="mono px-3 py-2 text-right tabular-nums text-white/60">
                      {row.solved}
                    </td>
                    <td className="mono px-3 py-2 text-right tabular-nums text-white/40">
                      {row.attempts}
                    </td>
                    <td className="mono px-3 py-2 text-right font-medium tabular-nums text-indigo-300">
                      {row.totalScore}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.userId}-details`} className="border-b border-white/5">
                      <td colSpan={4 + (compact ? 0 : problems.length)} className="bg-white/[0.02] px-6 py-3">
                        <div className="flex flex-wrap gap-4 text-xs text-white/50">
                          <span>Total Attempts: <span className="text-white/70">{row.attempts}</span></span>
                          <span>Problems Solved: <span className="text-white/70">{row.solved}</span></span>
                          <span>
                            Last Solve:{' '}
                            <span className="text-white/70">
                              {row.settledAt ? new Date(row.settledAt).toLocaleTimeString() : 'N/A'}
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pinned "You" row if not visible in top rows */}
      {myRow && myRow.rank > 10 && (
        <div className="rounded-lg border border-indigo-400/20 bg-indigo-500/5 px-4 py-2 text-sm">
          <span className="text-white/40">Your rank: </span>
          <span className="mono font-medium text-indigo-300">#{myRow.rank}</span>
          <span className="ml-3 text-white/40">Score: </span>
          <span className="mono font-medium text-indigo-300">{myRow.totalScore}</span>
        </div>
      )}
    </div>
  );
}
