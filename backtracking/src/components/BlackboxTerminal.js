'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { currentUser } from '@/lib/identity';

const TERMINAL_STORAGE_KEY = (slug) => `arena:probes:${slug}`;

export default function BlackboxTerminal({ contestKey, problem }) {
  const [history, setHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [probesRemaining, setProbesRemaining] = useState(problem.maxProbes ?? 100);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const historyEndRef = useRef(null);
  const inputRef = useRef(null);
  const cooldownRef = useRef(null);

  const cooldownMs = problem.probeCooldownMs ?? 3000;
  const maxProbes = problem.maxProbes ?? 100;

  // Restore probe history from sessionStorage
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(TERMINAL_STORAGE_KEY(problem.slug));
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed.history || []);
        setProbesRemaining(parsed.probesRemaining ?? maxProbes);
      }
    } catch {
      // Non-fatal
    }
  }, [problem.slug, maxProbes]);

  // Save probe history to sessionStorage
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        TERMINAL_STORAGE_KEY(problem.slug),
        JSON.stringify({ history, probesRemaining })
      );
    } catch {
      // Non-fatal
    }
  }, [history, probesRemaining, problem.slug]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 100) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // Client-side input validation against inputSpec bounds
  const validateInput = useCallback(
    (raw) => {
      if (!problem.inputSpec || problem.inputSpec.length === 0) return null;
      const tokens = raw.trim().split(/\s+/).filter(Boolean);
      if (tokens.length < problem.inputSpec.length) {
        return `Expected ${problem.inputSpec.length} value(s), got ${tokens.length}`;
      }
      for (let i = 0; i < problem.inputSpec.length; i++) {
        const spec = problem.inputSpec[i];
        const token = tokens[i];
        const type = (spec.type || 'int').toLowerCase();

        if (type === 'int' || type === 'long') {
          const val = Number.parseInt(token, 10);
          if (Number.isNaN(val)) return `"${spec.name}" must be an integer`;
          if (spec.min !== null && spec.min !== undefined && val < spec.min)
            return `"${spec.name}" must be ≥ ${spec.min}`;
          if (spec.max !== null && spec.max !== undefined && val > spec.max)
            return `"${spec.name}" must be ≤ ${spec.max}`;
        } else if (type === 'float' || type === 'double') {
          const val = Number.parseFloat(token);
          if (Number.isNaN(val)) return `"${spec.name}" must be a number`;
          if (spec.min !== null && spec.min !== undefined && val < spec.min)
            return `"${spec.name}" must be ≥ ${spec.min}`;
          if (spec.max !== null && spec.max !== undefined && val > spec.max)
            return `"${spec.name}" must be ≤ ${spec.max}`;
        }
      }
      return null;
    },
    [problem.inputSpec]
  );

  const sendProbe = async () => {
    if (loading || cooldown > 0 || probesRemaining <= 0) return;

    const raw = inputValue.trim();
    if (!raw) return;

    // Client-side validation
    const validationErr = validateInput(raw);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    if (!currentUser()) {
      setError('Sign in to use the blackbox terminal');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch('/api/arena/probe', {
        method: 'POST',
        body: { contestKey, problemSlug: problem.slug, input: raw },
      });

      setHistory((prev) => [
        ...prev,
        { input: raw, output: result.output, time: new Date().toLocaleTimeString() },
      ]);
      setProbesRemaining(result.probesRemaining ?? probesRemaining - 1);
      setInputValue('');
      setCooldown(cooldownMs);
    } catch (err) {
      setError(err.message || 'Probe failed');
      // Still start cooldown on error to prevent hammering
      setCooldown(cooldownMs);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendProbe();
    }
  };

  const cooldownPct = cooldown > 0 ? ((cooldownMs - cooldown) / cooldownMs) * 100 : 100;

  return (
    <div className="terminal-container flex flex-col overflow-hidden rounded-xl border border-emerald-400/20 bg-[#0a0e14]">
      {/* Header Bar */}
      <div className="terminal-header flex items-center justify-between border-b border-emerald-400/15 bg-[#0d1117] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500/70" />
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500/70" />
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="mono text-xs text-emerald-400/70">blackbox</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span
            className={`mono tabular-nums ${
              probesRemaining <= 10 ? 'text-red-300' : 'text-emerald-300/70'
            }`}
          >
            {probesRemaining}/{maxProbes} probes
          </span>
        </div>
      </div>

      {/* Input Spec Display */}
      {problem.inputSpec && problem.inputSpec.length > 0 && (
        <div className="border-b border-emerald-400/10 bg-[#0d1117]/50 px-4 py-2">
          <p className="text-xs text-emerald-300/50">
            Input:{' '}
            {problem.inputSpec.map((spec, i) => (
              <span key={i} className="text-emerald-300/80">
                {i > 0 ? ', ' : ''}
                <span className="text-cyan-300/70">{spec.type || 'int'}</span>{' '}
                <span className="text-emerald-200">{spec.name || `arg${i + 1}`}</span>
                {(spec.min !== null && spec.min !== undefined) ||
                (spec.max !== null && spec.max !== undefined) ? (
                  <span className="text-white/30">
                    {' '}
                    ({spec.min ?? '−∞'} ≤ {spec.name} ≤ {spec.max ?? '∞'})
                  </span>
                ) : null}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Terminal History */}
      <div className="terminal-history scroll-thin flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: '14rem', maxHeight: '22rem' }}>
        {/* Welcome message */}
        {history.length === 0 && (
          <div className="mb-4">
            <p className="text-sm text-emerald-400/60">
              Welcome to the blackbox terminal.
            </p>
            <p className="mt-1 text-xs text-white/30">
              Type an input below and press Enter to probe the hidden program.
              Observe the outputs and deduce the pattern.
            </p>

            {/* Example inputs */}
            {problem.exampleInputs && problem.exampleInputs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/25">Try these examples:</p>
                {problem.exampleInputs.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(ex.trim())}
                    className="mr-2 mt-1 rounded border border-emerald-400/20 bg-emerald-400/5 px-2 py-0.5 text-xs text-emerald-300/70 transition hover:border-emerald-400/40 hover:text-emerald-200"
                  >
                    {ex.trim()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Probe history entries */}
        {history.map((entry, i) => (
          <div key={i} className="mb-3 terminal-entry">
            <div className="flex items-start gap-2">
              <span className="terminal-prompt text-emerald-400">$</span>
              <span className="mono text-sm text-emerald-200">{entry.input}</span>
              <span className="ml-auto text-[10px] text-white/15">{entry.time}</span>
            </div>
            <pre className="terminal-output mono mt-1 whitespace-pre-wrap pl-5 text-sm text-white/80">
              {entry.output}
            </pre>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="border-t border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Cooldown progress bar */}
      {cooldown > 0 && (
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-emerald-400/50 transition-all duration-100"
            style={{ width: `${cooldownPct}%` }}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center gap-2 border-t border-emerald-400/15 bg-[#0d1117] px-4 py-3">
        <span className="terminal-prompt text-emerald-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || probesRemaining <= 0}
          placeholder={
            probesRemaining <= 0
              ? 'No probes remaining'
              : cooldown > 0
                ? `Wait ${Math.ceil(cooldown / 1000)}s...`
                : 'Enter input values...'
          }
          className="mono flex-1 bg-transparent text-sm text-emerald-100 outline-none placeholder:text-white/20 disabled:opacity-40"
        />
        <button
          onClick={sendProbe}
          disabled={loading || cooldown > 0 || probesRemaining <= 0 || !inputValue.trim()}
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {loading ? (
            <span className="terminal-blink">⏳</span>
          ) : cooldown > 0 ? (
            `${Math.ceil(cooldown / 1000)}s`
          ) : (
            'Run ↵'
          )}
        </button>
      </div>
    </div>
  );
}
