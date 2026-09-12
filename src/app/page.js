import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Quiz } from '@/models/Quiz';
import { QUIZ_STATUS } from '@/lib/constants';
import JoinRoomForm from '@/components/JoinRoomForm';

export const dynamic = 'force-dynamic';

const getQuizzes = async () => {
  await connectDB();
  return Quiz.find({ status: QUIZ_STATUS.PUBLISHED })
    .select('title description category questions')
    .sort({ createdAt: -1 })
    .lean();
};

export default async function HomePage() {
  const quizzes = await getQuizzes();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold">Quiz Mania</h1>
        <p className="mt-2 text-white/60">
          Host a live quiz or join an existing room with a 6-character code.
        </p>
      </section>

      <JoinRoomForm />

      <Link
        href="/arena"
        className="block rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 transition hover:border-indigo-400/60"
      >
        <p className="text-xs uppercase tracking-wider text-indigo-300/70">Level 2</p>
        <p className="mt-1 font-medium">Backtracking Arena &rarr;</p>
        <p className="mt-1 text-sm text-white/50">
          Infer the pattern, write C, get judged against hidden tests.
        </p>
      </Link>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Published quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="text-white/50">
            No quizzes yet — create one via <code className="text-indigo-300">POST /api/quizzes</code>.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <li key={String(quiz._id)} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Link href={`/quiz/${quiz._id}`} className="font-medium hover:text-indigo-300">
                  {quiz.title}
                </Link>
                <p className="mt-1 text-sm text-white/50">{quiz.description}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
                  {quiz.category} · {quiz.questions?.length ?? 0} questions
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
