import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Room } from '@/models/Room';
import { Quiz } from '@/models/Quiz';
import { ROOM_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
};

export async function POST(request) {
  await connectDB();

  try {
    const { quizId, hostId } = await request.json();
    if (!quizId || !hostId) {
      return NextResponse.json(
        { success: false, message: 'quizId and hostId are required' },
        { status: 400 }
      );
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json({ success: false, message: 'Quiz not found' }, { status: 404 });
    }

    // Retry on the (rare) chance of a duplicate code.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const room = await Room.create({
          code: generateCode(),
          quiz: quiz._id,
          hostId,
          status: ROOM_STATUS.LOBBY,
        });
        return NextResponse.json({ success: true, data: room }, { status: 201 });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }

    return NextResponse.json(
      { success: false, message: 'Could not allocate a room code' },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
