import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isCorrect: { type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null, index: true },
    playerId: { type: String, required: true, index: true },
    playerName: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attemptSchema.index({ room: 1, playerId: 1 }, { unique: true, sparse: true });

export const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
