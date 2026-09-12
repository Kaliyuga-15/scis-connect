import { SOCKET_EVENTS, ROOM_STATUS } from '../../lib/constants.js';
import { Room } from '../../models/Room.js';
import { Quiz } from '../../models/Quiz.js';
import { Attempt } from '../../models/Attempt.js';

const roomChannel = (code) => `room:${code}`;

// Questions are broadcast without the `isCorrect` flag so clients cannot peek.
const sanitizeQuestion = (question, index, total) => ({
  index,
  total,
  id: question._id.toString(),
  text: question.text,
  points: question.points,
  timeLimitSec: question.timeLimitSec,
  options: question.options.map((o) => ({ id: o._id.toString(), text: o.text })),
});

const leaderboardOf = (room) =>
  [...room.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, playerId: p.playerId, name: p.name, score: p.score }));

const roomState = (room, quiz) => ({
  code: room.code,
  status: room.status,
  hostId: room.hostId,
  quiz: { id: quiz._id.toString(), title: quiz.title, questionCount: quiz.questions.length },
  currentQuestionIndex: room.currentQuestionIndex,
  players: leaderboardOf(room),
});

export const registerQuizHandlers = (io, socket) => {
  const fail = (message) => socket.emit(SOCKET_EVENTS.ERROR, { message });

  const loadRoom = async (code) => {
    const room = await Room.findOne({ code: String(code).toUpperCase() });
    if (!room) return null;
    const quiz = await Quiz.findById(room.quiz);
    if (!quiz) return null;
    return { room, quiz };
  };

  socket.on(SOCKET_EVENTS.ROOM_JOIN, async ({ code } = {}) => {
    try {
      const loaded = await loadRoom(code);
      if (!loaded) return fail('Room not found');
      const { room, quiz } = loaded;

      if (!room.players.some((p) => p.playerId === socket.playerId)) {
        room.players.push({ playerId: socket.playerId, name: socket.playerName, score: 0 });
        await room.save();
      }

      socket.join(roomChannel(room.code));
      socket.data.roomCode = room.code;

      socket.emit(SOCKET_EVENTS.ROOM_STATE, roomState(room, quiz));
      socket.to(roomChannel(room.code)).emit(SOCKET_EVENTS.ROOM_PLAYER_JOINED, {
        playerId: socket.playerId,
        name: socket.playerName,
      });
    } catch (err) {
      console.error('[socket] room:join', err);
      fail('Could not join the room');
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, async () => {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.leave(roomChannel(code));
    socket.data.roomCode = null;
    io.to(roomChannel(code)).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, { playerId: socket.playerId });
  });

  // Host-only: move the room to the first question.
  socket.on(SOCKET_EVENTS.QUIZ_START, async ({ code } = {}) => {
    try {
      const loaded = await loadRoom(code);
      if (!loaded) return fail('Room not found');
      const { room, quiz } = loaded;

      if (room.hostId !== socket.playerId) return fail('Only the host can start the quiz');
      if (!quiz.questions.length) return fail('This quiz has no questions');

      room.status = ROOM_STATUS.IN_PROGRESS;
      room.currentQuestionIndex = 0;
      room.questionStartedAt = new Date();
      await room.save();

      io.to(roomChannel(room.code)).emit(
        SOCKET_EVENTS.QUIZ_QUESTION,
        sanitizeQuestion(quiz.questions[0], 0, quiz.questions.length)
      );
    } catch (err) {
      console.error('[socket] quiz:start', err);
      fail('Could not start the quiz');
    }
  });

  socket.on(SOCKET_EVENTS.QUIZ_ANSWER, async ({ code, questionId, optionId } = {}) => {
    try {
      const loaded = await loadRoom(code);
      if (!loaded) return fail('Room not found');
      const { room, quiz } = loaded;

      if (room.status !== ROOM_STATUS.IN_PROGRESS) return fail('The quiz is not running');

      const question = quiz.questions.id(questionId);
      if (!question) return fail('Unknown question');

      const attempt =
        (await Attempt.findOne({ room: room._id, playerId: socket.playerId })) ??
        new Attempt({
          quiz: quiz._id,
          room: room._id,
          playerId: socket.playerId,
          playerName: socket.playerName,
        });

      if (attempt.answers.some((a) => a.questionId.equals(question._id))) {
        return fail('You already answered this question');
      }

      const chosen = question.options.id(optionId);
      const isCorrect = Boolean(chosen?.isCorrect);
      const pointsAwarded = isCorrect ? question.points : 0;

      attempt.answers.push({
        questionId: question._id,
        optionId: chosen?._id ?? null,
        isCorrect,
        pointsAwarded,
      });
      attempt.score += pointsAwarded;
      await attempt.save();

      const player = room.players.find((p) => p.playerId === socket.playerId);
      if (player) {
        player.score += pointsAwarded;
        await room.save();
      }

      socket.emit(SOCKET_EVENTS.QUIZ_ANSWER_RESULT, {
        questionId: question._id.toString(),
        isCorrect,
        pointsAwarded,
        score: attempt.score,
      });
      io.to(roomChannel(room.code)).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, leaderboardOf(room));
    } catch (err) {
      console.error('[socket] quiz:answer', err);
      fail('Could not record your answer');
    }
  });

  // Host-only: advance to the next question, or end the quiz.
  socket.on(SOCKET_EVENTS.QUIZ_NEXT, async ({ code } = {}) => {
    try {
      const loaded = await loadRoom(code);
      if (!loaded) return fail('Room not found');
      const { room, quiz } = loaded;

      if (room.hostId !== socket.playerId) return fail('Only the host can advance the quiz');

      const nextIndex = room.currentQuestionIndex + 1;

      if (nextIndex >= quiz.questions.length) {
        room.status = ROOM_STATUS.FINISHED;
        room.questionStartedAt = null;
        await room.save();
        await Attempt.updateMany({ room: room._id, completedAt: null }, { completedAt: new Date() });
        io.to(roomChannel(room.code)).emit(SOCKET_EVENTS.QUIZ_END, {
          leaderboard: leaderboardOf(room),
        });
        return;
      }

      room.currentQuestionIndex = nextIndex;
      room.questionStartedAt = new Date();
      await room.save();

      io.to(roomChannel(room.code)).emit(
        SOCKET_EVENTS.QUIZ_QUESTION,
        sanitizeQuestion(quiz.questions[nextIndex], nextIndex, quiz.questions.length)
      );
    } catch (err) {
      console.error('[socket] quiz:next', err);
      fail('Could not advance the quiz');
    }
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    io.to(roomChannel(code)).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, { playerId: socket.playerId });
  });
};
