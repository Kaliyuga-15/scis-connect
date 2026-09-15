import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

const { connectDB, disconnectDB } = await import('../src/lib/db.js');
const { Quiz } = await import('../src/models/Quiz.js');
const { QUIZ_STATUS } = await import('../src/lib/constants.js');

const sample = {
  title: 'MCA General Knowledge',
  description: 'A short warm-up round to check the realtime pipeline.',
  category: 'general',
  status: QUIZ_STATUS.PUBLISHED,
  questions: [
    {
      text: 'Which data structure uses FIFO ordering?',
      points: 10,
      timeLimitSec: 20,
      options: [
        { text: 'Stack', isCorrect: false },
        { text: 'Queue', isCorrect: true },
        { text: 'Tree', isCorrect: false },
        { text: 'Graph', isCorrect: false },
      ],
    },
    {
      text: 'What does SQL stand for?',
      points: 10,
      timeLimitSec: 20,
      options: [
        { text: 'Structured Query Language', isCorrect: true },
        { text: 'Simple Question Language', isCorrect: false },
        { text: 'Sequential Query Logic', isCorrect: false },
      ],
    },
  ],
};

const run = async () => {
  await connectDB();
  const existing = await Quiz.findOne({ title: sample.title });

  if (existing) {
    console.log(`Quiz already seeded: ${existing._id}`);
  } else {
    const quiz = await Quiz.create(sample);
    console.log(`Seeded quiz: ${quiz._id}`);
  }

  await disconnectDB();
};

run().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
