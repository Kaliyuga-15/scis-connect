'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { savePlayer } from '@/lib/player';

export default function JoinRoomForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const onSubmit = (event) => {
    event.preventDefault();
    if (!name.trim() || code.trim().length !== 6) return;
    savePlayer({ name: name.trim() });
    router.push(`/room/${code.trim().toUpperCase()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 outline-none focus:border-indigo-400"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ROOM CODE"
        maxLength={6}
        className="w-40 rounded-lg border border-white/10 bg-transparent px-3 py-2 tracking-widest outline-none focus:border-indigo-400"
      />
      <button type="submit" className="rounded-lg bg-indigo-500 px-5 py-2 font-medium hover:bg-indigo-400">
        Join
      </button>
    </form>
  );
}
