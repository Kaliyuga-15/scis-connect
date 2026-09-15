import { Server } from 'socket.io';
import { registerQuizHandlers } from './quizHandlers.js';
import { registerArenaHandlers } from './arenaHandlers.js';
import { ARENA_NAMESPACE } from '../../lib/constants.js';
import { identityFromHeaders } from '../../lib/auth.js';
import { setArenaNamespace } from '../../lib/realtime.js';

let ioInstance = null;

// Quiz events live on the default namespace, arena events on `/arena` — one
// Socket.IO server, one port, no event-name collisions possible.
const attachArenaNamespace = (io) => {
  const namespace = io.of(ARENA_NAMESPACE);

  namespace.use((socket, next) => {
    // The handshake carries the same bearer token (or dev header) the arena
    // HTTP API expects, so a socket can never claim an identity the API would
    // have rejected. This is the auth gap Quiz Mania's own quiz namespace does
    // not yet close (see io.use below) - fix both together when the real
    // SCIS Connect auth project is wired in.
    const identity = identityFromHeaders({
      get: (key) => socket.handshake.auth?.[key] ?? socket.handshake.headers?.[key] ?? null,
    });

    if (!identity) return next(new Error('unauthorized'));

    socket.data.identity = identity;
    return next();
  });

  registerArenaHandlers(namespace);
  setArenaNamespace(namespace);

  return namespace;
};

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Placeholder identity: swap for a real JWT check once auth is wired up.
  // (Same caveat the arena namespace below closes for itself - see its own
  // identity check.)
  io.use((socket, next) => {
    const { playerId, name } = socket.handshake.auth || {};
    if (!playerId || !name) {
      return next(new Error('playerId and name are required'));
    }
    socket.playerId = String(playerId);
    socket.playerName = String(name);
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.id} (${socket.playerName})`);

    registerQuizHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected ${socket.id}: ${reason}`);
    });
  });

  attachArenaNamespace(io);

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error('Socket.IO has not been initialised');
  return ioInstance;
};
