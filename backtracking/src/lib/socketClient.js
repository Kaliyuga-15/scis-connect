'use client';

import { io } from 'socket.io-client';
import { ARENA_NAMESPACE } from './constants';
import { socketAuth } from './identity';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// --- Quiz Mania: default namespace, playerId/name auth ---------------------

let quizSocket = null;

// One shared connection per browser tab; callers pass the identity the
// server middleware expects in `handshake.auth`.
export const getSocket = ({ playerId, name }) => {
  if (quizSocket?.connected || quizSocket?.connecting) return quizSocket;

  quizSocket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: { playerId, name },
  });

  return quizSocket;
};

export const disconnectSocket = () => {
  quizSocket?.disconnect();
  quizSocket = null;
};

// --- Backtracking Arena: /arena namespace, JWT/dev-header auth --------------
//
// Cached on window rather than a module-level variable so React strict-mode's
// double effect run does not open two sockets.
export const getArenaSocket = () => {
  if (typeof window === 'undefined') return null;

  if (!window.__arenaSocket) {
    window.__arenaSocket = io(`${SOCKET_URL}${ARENA_NAMESPACE}`, {
      path: '/socket.io',
      auth: socketAuth(),
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }

  return window.__arenaSocket;
};

export const resetArenaSocket = () => {
  if (typeof window === 'undefined') return;
  window.__arenaSocket?.disconnect();
  window.__arenaSocket = null;
};
