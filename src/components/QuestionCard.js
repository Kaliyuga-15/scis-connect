'use client';

import { useEffect, useState } from 'react';

export default function QuestionCard({ question, onAnswer, result }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSelected(null);
  }, [question.id]);

  const choose = (optionId) => {
    if (selected) return;
    setSelected(optionId);
    onAnswer(optionId);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-wide text-white/40">
        Question {question.index + 1} of {question.total} · {question.points} pts ·{' '}
        {question.timeLimitSec}s
      </p>
      <h2 className="mt-2 text-xl font-semibold">{question.text}</h2>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <li key={option.id}>
            <button
              onClick={() => choose(option.id)}
              disabled={Boolean(selected)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                selected === option.id
                  ? 'border-indigo-400 bg-indigo-500/20'
                  : 'border-white/10 hover:border-white/30 hover:bg-white/5'
              } disabled:cursor-not-allowed`}
            >
              {option.text}
            </button>
          </li>
        ))}
      </ul>

      {result && (
        <p className={`mt-4 text-sm ${result.isCorrect ? 'text-emerald-400' : 'text-red-300'}`}>
          {result.isCorrect ? `Correct! +${result.pointsAwarded}` : 'Not quite.'} Score: {result.score}
        </p>
      )}
    </section>
  );
}
