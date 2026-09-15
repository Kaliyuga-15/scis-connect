import mongoose from 'mongoose';
import { QUIZ_STATUS } from '../lib/constants.js';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    options: {
      type: [optionSchema],
      validate: [(v) => v.length >= 2, 'A question needs at least 2 options'],
    },
    points: { type: Number, default: 10, min: 0 },
    timeLimitSec: { type: Number, default: 30, min: 5 },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'general', index: true },
    status: { type: String, enum: Object.values(QUIZ_STATUS), default: QUIZ_STATUS.DRAFT, index: true },
    questions: { type: [questionSchema], default: [] },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

quizSchema.virtual('questionCount').get(function questionCount() {
  return this.questions.length;
});

quizSchema.set('toJSON', { virtuals: true });

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
