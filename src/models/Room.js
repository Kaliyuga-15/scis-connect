import mongoose from 'mongoose';
import { ROOM_STATUS } from '../lib/constants.js';

const playerSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    score: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    hostId: { type: String, required: true },
    status: { type: String, enum: Object.values(ROOM_STATUS), default: ROOM_STATUS.LOBBY, index: true },
    currentQuestionIndex: { type: Number, default: -1 },
    questionStartedAt: { type: Date, default: null },
    players: { type: [playerSchema], default: [] },
  },
  { timestamps: true }
);

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
