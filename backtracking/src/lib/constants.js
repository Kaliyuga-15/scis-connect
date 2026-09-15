export const QUIZ_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const ROOM_STATUS = {
  LOBBY: 'lobby',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
};

// Socket event names shared by the server handlers and the client hook.
export const SOCKET_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_STATE: 'room:state',
  ROOM_PLAYER_JOINED: 'room:player-joined',
  ROOM_PLAYER_LEFT: 'room:player-left',
  QUIZ_START: 'quiz:start',
  QUIZ_QUESTION: 'quiz:question',
  QUIZ_ANSWER: 'quiz:answer',
  QUIZ_ANSWER_RESULT: 'quiz:answer-result',
  QUIZ_NEXT: 'quiz:next',
  QUIZ_END: 'quiz:end',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  ERROR: 'quiz:error',
};

// --- Backtracking Arena (Level 2) -------------------------------------------

export const LEVELS = {
  BACKTRACKING: 'backtracking',
};

export const PROBLEM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const CONTEST_STATUS = {
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  ENDED: 'ended',
};

export const VERDICT = {
  QUEUED: 'queued',
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  RUNTIME_ERROR: 'runtime_error',
  OUTPUT_LIMIT_EXCEEDED: 'output_limit_exceeded',
  COMPILE_ERROR: 'compile_error',
  INTERNAL_ERROR: 'internal_error',
};

export const TEST_STATUS = {
  PASSED: 'passed',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  RUNTIME_ERROR: 'runtime_error',
  OUTPUT_LIMIT_EXCEEDED: 'output_limit_exceeded',
  INTERNAL_ERROR: 'internal_error',
  SKIPPED: 'skipped',
};

export const VERDICT_LABEL = {
  [VERDICT.QUEUED]: 'Queued',
  [VERDICT.ACCEPTED]: 'Accepted',
  [VERDICT.WRONG_ANSWER]: 'Wrong Answer',
  [VERDICT.TIME_LIMIT_EXCEEDED]: 'Time Limit Exceeded',
  [VERDICT.RUNTIME_ERROR]: 'Runtime Error',
  [VERDICT.OUTPUT_LIMIT_EXCEEDED]: 'Output Limit Exceeded',
  [VERDICT.COMPILE_ERROR]: 'Compile Error',
  [VERDICT.INTERNAL_ERROR]: 'Judge Error',
};

// Namespaced so these can share a Socket.IO server with Quiz Mania's quiz
// events without any chance of a name collision.
export const ARENA_SOCKET_EVENTS = {
  JOIN: 'arena:join',
  LEAVE: 'arena:leave',
  CONTEST_STATE: 'arena:contest-state',
  LEADERBOARD_UPDATE: 'arena:leaderboard',
  SUBMISSION_RESULT: 'arena:submission-result',
  ERROR: 'arena:error',
};

export const ARENA_NAMESPACE = '/arena';
