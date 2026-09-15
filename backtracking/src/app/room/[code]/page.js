'use client';

import { use, useEffect, useState } from 'react';
import { getPlayer } from '@/lib/player';
import { useQuizRoom } from '@/hooks/useQuizRoom';
import Leaderboard from '@/components/Leaderboard';
import QuestionCard from '@/components/QuestionCard';

export default function RoomPage({ params }) {
  const { code } = use(params);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    setPlayer(getPlayer());
  }, []);

  const { connected, room, question, leaderboard, lastResult, finished, error, isHost, start, next, answer } =
    useQuizRoom({ code, playerId: player?.playerId, name: player?.name });

  if (!player) {
    return <p className="text-white/60">Pick a name on the home page first, then rejoin this room.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          Room <span className="tracking-widest text-indigo-400">{code}</span>
        </h1>
        <span className={connected ? 'text-sm text-emerald-400' : 'text-sm text-white/40'}>
          {connected ? 'connected' : 'connecting…'}
        </span>
      </header>

      {error && <p className="rounded-lg bg-red-500/15 px-4 py-2 text-sm text-red-300">{error}</p>}

      {room && (
        <p className="text-white/60">
          {room.quiz.title} · {room.quiz.questionCount} questions · status {room.status}
        </p>
      )}

      {finished ? (
        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Final scores</h2>
          <Leaderboard entries={leaderboard} />
        </section>
      ) : question ? (
        <QuestionCard question={question} onAnswer={answer} result={lastResult} />
      ) : (
        <p className="text-white/50">Waiting for the host to start…</p>
      )}

      {isHost && !finished && (
        <div className="flex gap-3">
          <button onClick={start} className="rounded-lg bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400">
            Start quiz
          </button>
          <button onClick={next} className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:bg-white/10">
            Next question
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Players</h2>
        <Leaderboard entries={leaderboard} />
      </section>
    </div>
  );
}
