import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Quiz } from '@/models/Quiz';
import HostRoomButton from '@/components/HostRoomButton';

export const dynamic = 'force-dynamic';

export default async function QuizPage({ params }) {
  const { id } = await params;

  await connectDB();
  const quiz = await Quiz.findById(id).select('-questions.options.isCorrect').lean().catch(() => null);
  if (!quiz) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <p className="mt-1 text-white/60">{quiz.description}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
          {quiz.category} · {quiz.questions.length} questions
        </p>
      </header>

      <HostRoomButton quizId={String(quiz._id)} />

      <ol className="space-y-3">
        {quiz.questions.map((question, index) => (
          <li key={String(question._id)} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium">
              {index + 1}. {question.text}
            </p>
            <ul className="mt-2 grid gap-1 text-sm text-white/60 sm:grid-cols-2">
              {question.options.map((option) => (
                <li key={String(option._id)}>· {option.text}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
