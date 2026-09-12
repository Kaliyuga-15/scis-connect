import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Quiz } from '@/models/Quiz';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  await connectDB();
  const { id } = await params;

  const quiz = await Quiz.findById(id).select('-questions.options.isCorrect').lean();
  if (!quiz) {
    return NextResponse.json({ success: false, message: 'Quiz not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: quiz });
}

export async function PATCH(request, { params }) {
  await connectDB();
  const { id } = await params;

  try {
    const body = await request.json();
    const quiz = await Quiz.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!quiz) {
      return NextResponse.json({ success: false, message: 'Quiz not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: quiz });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  await connectDB();
  const { id } = await params;

  const quiz = await Quiz.findByIdAndDelete(id);
  if (!quiz) {
    return NextResponse.json({ success: false, message: 'Quiz not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { id } });
}
