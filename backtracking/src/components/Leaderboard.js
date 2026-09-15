export default function Leaderboard({ entries = [] }) {
  if (entries.length === 0) {
    return <p className="text-white/50">Nobody here yet.</p>;
  }

  return (
    <ol className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
      {entries.map((entry, index) => (
        <li key={entry.playerId} className="flex items-center justify-between px-4 py-2">
          <span>
            <span className="mr-3 text-white/40">{entry.rank ?? index + 1}</span>
            {entry.name}
          </span>
          <span className="font-medium text-indigo-300">{entry.score ?? 0}</span>
        </li>
      ))}
    </ol>
  );
}
