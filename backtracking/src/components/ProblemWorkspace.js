'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useArena } from '@/hooks/useArena';
import { apiFetch } from '@/lib/apiClient';
import { currentUser } from '@/lib/identity';
import BlackboxTerminal from './BlackboxTerminal';
import CodeEditor from './CodeEditor';
import VerdictPanel from './VerdictPanel';
import ContestTimer from './ContestTimer';

const draftKey = (slug) => `arena:draft:${slug}`;

export default function ProblemWorkspace({ contestKey, problem }) {
  const { contest } = useArena(contestKey);
  const [source, setSource] = useState('');
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [mobileTab, setMobileTab] = useState('terminal');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Restore the draft before first paint of the editor so a refresh mid-contest
  // never costs someone their work.
  useEffect(() => {
    let restored = null;
    try {
      restored = window.localStorage.getItem(draftKey(problem.slug));
    } catch {
      // Private mode; fall back to the starter.
    }

    let starterCode = problem.starterCode ?? '';
    // In function mode, show the function stub as starter code
    if (problem.useFunctionMode && !restored) {
      const sig = problem.functionSignature || `void ${problem.functionName || 'solve'}(int n)`;
      starterCode = `${sig} {\n    // Write your solution here\n    \n}\n`;
    }

    setSource(restored ?? starterCode);
    setSignedIn(Boolean(currentUser()));
    setReady(true);
  }, [problem.slug, problem.starterCode, problem.useFunctionMode, problem.functionSignature, problem.functionName]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(draftKey(problem.slug), source);
    } catch {
      // Non-fatal.
    }
  }, [source, problem.slug, ready]);

  const loadHistory = useCallback(() => {
    if (!signedIn) return;
    apiFetch(
      `/api/arena/submissions?key=${encodeURIComponent(contestKey)}&problemSlug=${encodeURIComponent(problem.slug)}`
    )
      .then(setHistory)
      .catch(() => {});
  }, [contestKey, problem.slug, signedIn]);

  useEffect(loadHistory, [loadHistory]);

  const submit = async () => {
    setPending(true);
    setError(null);
    setSubmission(null);

    try {
      const result = await apiFetch('/api/arena/submissions', {
        method: 'POST',
        body: { contestKey, problemSlug: problem.slug, source },
      });
      setSubmission(result);
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  // Resizable split drag handling
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(70, Math.max(30, pct)));
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const accepting = contest?.accepting ?? false;
  const canSubmit = ready && signedIn && !pending && source.trim().length > 0;

  const difficultyColors = {
    easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    medium: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    hard: 'bg-red-500/15 text-red-300 border-red-400/30',
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="text-sm text-white/50 transition hover:text-white/80">
            &larr; All problems
          </Link>
          {problem.difficulty && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                difficultyColors[problem.difficulty] || difficultyColors.medium
              }`}
            >
              {problem.difficulty}
            </span>
          )}
        </div>
        <ContestTimer contest={contest} />
      </div>

      {/* Problem header */}
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <span className="mono shrink-0 text-sm tabular-nums text-indigo-300">
            {problem.points} pts
          </span>
        </div>
        <p className="mt-1 text-xs text-white/40">
          {problem.timeLimitMs}ms per test · {problem.memoryMb}MB · C only
          {problem.useFunctionMode && (
            <span className="ml-2 text-cyan-300/50">
              Function mode: <code className="text-cyan-300/70">{problem.functionSignature || 'void solve(...)'}</code>
            </span>
          )}
        </p>
      </header>

      {problem.statement && (
        <p className="text-sm leading-6 text-white/70">{problem.statement}</p>
      )}

      {problem.hint && (
        <div>
          {showHint ? (
            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              💡 {problem.hint}
            </p>
          ) : (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-amber-300/70 underline-offset-4 transition hover:text-amber-200 hover:underline"
            >
              Reveal hint
            </button>
          )}
        </div>
      )}

      {/* Mobile tab switcher */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1 lg:hidden">
        <button
          onClick={() => setMobileTab('terminal')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mobileTab === 'terminal'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          ⬛ Terminal
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mobileTab === 'editor'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          ✏️ Editor
        </button>
      </div>

      {/* Two-pane layout (desktop: side-by-side, mobile: tabbed) */}
      <div ref={containerRef} className="hidden lg:flex" style={{ gap: 0 }}>
        {/* Left pane — Blackbox Terminal */}
        <div style={{ width: `${splitPercent}%` }} className="min-w-0 pr-1">
          <BlackboxTerminal contestKey={contestKey} problem={problem} />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`group flex w-3 cursor-col-resize items-center justify-center ${
            isDragging ? 'bg-indigo-400/10' : ''
          }`}
        >
          <div className="h-8 w-1 rounded-full bg-white/10 transition group-hover:bg-indigo-400/40" />
        </div>

        {/* Right pane — Code Editor + Submit */}
        <div style={{ width: `${100 - splitPercent}%` }} className="min-w-0 space-y-3 pl-1">
          {ready ? (
            <CodeEditor
              value={source}
              onChange={setSource}
              disabled={pending}
              problem={problem}
            />
          ) : (
            <div className="h-[26rem] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => {
                if (problem.useFunctionMode) {
                  const sig = problem.functionSignature || `void ${problem.functionName || 'solve'}(int n)`;
                  setSource(`${sig} {\n    // Write your solution here\n    \n}\n`);
                } else {
                  setSource(problem.starterCode ?? '');
                }
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition hover:border-white/30 hover:text-white/80"
            >
              Reset
            </button>

            <div className="flex items-center gap-3">
              {!accepting && (
                <span className="text-xs text-white/40">
                  {contest ? 'Submissions are closed' : 'Connecting...'}
                </span>
              )}
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="submit-btn rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? 'Judging...' : 'Submit'}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <VerdictPanel submission={submission} pending={pending} />

          {history.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/50">
                Your attempts
              </h2>
              <ul className="space-y-1">
                {history.slice(0, 6).map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs"
                  >
                    <span className="text-white/50">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="mono tabular-nums text-white/60">
                      {item.passed}/{item.total}
                    </span>
                    <span className="mono tabular-nums text-indigo-300">{item.score} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile stacked layout */}
      <div className="lg:hidden">
        {mobileTab === 'terminal' && (
          <BlackboxTerminal contestKey={contestKey} problem={problem} />
        )}
        {mobileTab === 'editor' && (
          <div className="space-y-3">
            {ready ? (
              <CodeEditor
                value={source}
                onChange={setSource}
                disabled={pending}
                problem={problem}
              />
            ) : (
              <div className="h-[26rem] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setSource(problem.starterCode ?? '')}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition hover:border-white/30 hover:text-white/80"
              >
                Reset
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="submit-btn rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? 'Judging...' : 'Submit'}
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <VerdictPanel submission={submission} pending={pending} />
          </div>
        )}
      </div>
    </div>
  );
}
