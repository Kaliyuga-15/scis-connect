'use client';

const STORAGE_KEY = 'quizmania:player';

// Placeholder identity until SCIS Connect auth is wired in: a stable random id
// per browser plus whatever display name the user typed.
export const getPlayer = () => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // localStorage can throw in private mode; fall through to a fresh identity.
  }
  return null;
};

export const savePlayer = ({ name }) => {
  const existing = getPlayer();
  const player = {
    playerId: existing?.playerId ?? `p_${Math.random().toString(36).slice(2, 10)}`,
    name,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {
    // Non-fatal: the identity just won't survive a reload.
  }

  return player;
};
