import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Quiz } from '@/models/Quiz';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  await connectDB();

  const status = request.nextUrl.searchParams.get('status');
  const filter = status ? { status } : {};

  const quizzes = await Quiz.find(filter)
    .select('-questions.options.isCorrect')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: quizzes });
}

export async function POST(request) {
  await connectDB();

  try {
    const body = await request.json();
    const quiz = await Quiz.create({
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      questions: body.questions ?? [],
      createdBy: body.createdBy ?? null,
    });
    return NextResponse.json({ success: true, data: quiz }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
