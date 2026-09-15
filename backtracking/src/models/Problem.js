import mongoose from 'mongoose';
import { LEVELS, PROBLEM_STATUS, DIFFICULTY } from '../lib/constants.js';
import { COMPARISON } from '../lib/judge/compare.js';

// One document per card. Adding, editing or retiring a problem is a data
// change -- no deploy, no code edit.

const sampleSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const hiddenTestSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
  },
  { _id: false }
);

const inputArgSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'n' },
    type: { type: String, enum: ['int', 'long', 'float', 'double', 'string', 'array'], default: 'int' },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    level: { type: String, default: LEVELS.BACKTRACKING, index: true },
    order: { type: Number, default: 0 },
    difficulty: {
      type: String,
      enum: Object.values(DIFFICULTY),
      default: DIFFICULTY.MEDIUM,
    },

    // Pattern-inference problems intentionally ship with little or no prose --
    // the samples are the specification. Both stay optional.
    statement: { type: String, default: '' },
    hint: { type: String, default: '' },
    starterCode: { type: String, default: '' },

    // Interactive blackbox exploration configuration
    inputSpec: { type: [inputArgSchema], default: [] },
    argCount: { type: Number, default: 1 },
    functionName: { type: String, default: 'solve' },
    functionSignature: { type: String, default: 'void solve(int n)' },
    returnType: { type: String, default: 'void' },
    useFunctionMode: { type: Boolean, default: true },
    maxProbes: { type: Number, default: 100, min: 1, max: 1000 },
    probeCooldownMs: { type: Number, default: 3000, min: 500, max: 30000 },
    exampleInputs: { type: [String], default: [] },
    exampleOutputs: { type: [String], default: [] },

    samples: { type: [sampleSchema], default: [] },

    // select:false so a plain find() can never ship the answer key to a client,
    // the same way Quiz Mania hides `isCorrect`. The judge opts in explicitly
    // with .select('+hiddenTests').
    hiddenTests: { type: [hiddenTestSchema], default: [], select: false },
    referenceSolution: { type: String, default: '', select: false },

    points: { type: Number, default: 100, min: 0 },
    timeLimitMs: { type: Number, default: 2000, min: 100, max: 10000 },
    memoryMb: { type: Number, default: 256, min: 16, max: 1024 },
    comparison: {
      type: String,
      enum: Object.values(COMPARISON),
      default: COMPARISON.TRIMMED,
    },

    status: {
      type: String,
      enum: Object.values(PROBLEM_STATUS),
      default: PROBLEM_STATUS.DRAFT,
      index: true,
    },
  },
  { timestamps: true }
);

problemSchema.index({ level: 1, order: 1 });

export const Problem = mongoose.models.Problem || mongoose.model('Problem', problemSchema);
