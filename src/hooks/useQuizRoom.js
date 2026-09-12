'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socketClient';
import { SOCKET_EVENTS } from '@/lib/constants';

/**
 * Connects to the quiz room over Socket.IO and mirrors its live state.
 * Returns the room snapshot plus the actions a player or host can take.
 */
export const useQuizRoom = ({ code, playerId, name }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [question, setQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code || !playerId || !name) return undefined;

    const socket = getSocket({ playerId, name });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit(SOCKET_EVENTS.ROOM_JOIN, { code });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (state) => {
      setRoom(state);
      setLeaderboard(state.players ?? []);
    };
    const onQuestion = (payload) => {
      setQuestion(payload);
      setLastResult(null);
    };
    const onAnswerResult = (payload) => setLastResult(payload);
    const onLeaderboard = (payload) => setLeaderboard(payload);
    const onEnd = (payload) => {
      setFinished(true);
      setQuestion(null);
      setLeaderboard(payload.leaderboard ?? []);
    };
    const onPlayerJoined = (player) =>
      setLeaderboard((prev) =>
        prev.some((p) => p.playerId === player.playerId)
          ? prev
          : [...prev, { ...player, score: 0, rank: prev.length + 1 }]
      );
    const onPlayerLeft = ({ playerId: gone }) =>
      setLeaderboard((prev) => prev.filter((p) => p.playerId !== gone));
    const onError = ({ message }) => setError(message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', (err) => setError(err.message));
    socket.on(SOCKET_EVENTS.ROOM_STATE, onState);
    socket.on(SOCKET_EVENTS.ROOM_PLAYER_JOINED, onPlayerJoined);
    socket.on(SOCKET_EVENTS.ROOM_PLAYER_LEFT, onPlayerLeft);
    socket.on(SOCKET_EVENTS.QUIZ_QUESTION, onQuestion);
    socket.on(SOCKET_EVENTS.QUIZ_ANSWER_RESULT, onAnswerResult);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, onLeaderboard);
    socket.on(SOCKET_EVENTS.QUIZ_END, onEnd);
    socket.on(SOCKET_EVENTS.ERROR, onError);

    if (socket.connected) onConnect();

    return () => {
      socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
      socket.off();
      disconnectSocket();
      socketRef.current = null;
    };
  }, [code, playerId, name]);

  const start = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.QUIZ_START, { code });
  }, [code]);

  const next = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.QUIZ_NEXT, { code });
  }, [code]);

  const answer = useCallback(
    (optionId) => {
      if (!question) return;
      socketRef.current?.emit(SOCKET_EVENTS.QUIZ_ANSWER, {
        code,
        questionId: question.id,
        optionId,
      });
    },
    [code, question]
  );

  const isHost = Boolean(room && room.hostId === playerId);

  return { connected, room, question, leaderboard, lastResult, finished, error, isHost, start, next, answer };
};
