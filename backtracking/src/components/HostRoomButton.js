'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getPlayer, savePlayer } from '@/lib/player';

export default function HostRoomButton({ quizId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const host = async () => {
    setBusy(true);
    setError(null);

    try {
      const player = getPlayer() ?? savePlayer({ name: 'Host' });
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, hostId: player.playerId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      router.push(`/room/${json.data.code}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={host}
        disabled={busy}
        className="rounded-lg bg-indigo-500 px-5 py-2 font-medium hover:bg-indigo-400 disabled:opacity-50"
      >
        {busy ? 'Creating room…' : 'Host a live room'}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
