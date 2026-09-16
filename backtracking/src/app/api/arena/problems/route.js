import { connectDB } from '@/lib/db';
import { Problem } from '@/models/Problem';
import { ok, withErrors } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { LEVELS, PROBLEM_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// hiddenTests and referenceSolution are select:false, so a plain find() is
// already safe to hand to a contestant.
export const GET = withErrors(async (request) => {
  await connectDB();

  const level = request.nextUrl.searchParams.get('level') ?? LEVELS.BACKTRACKING;
  const includeUnpublished = request.nextUrl.searchParams.get('all') === 'true';

  const filter = { level };
  if (!includeUnpublished) filter.status = PROBLEM_STATUS.PUBLISHED;
  if (includeUnpublished) requireAdmin(request);

  const problems = await Problem.find(filter).sort({ order: 1, createdAt: 1 }).lean();

  return ok(problems);
});

export const POST = withErrors(async (request) => {
  requireAdmin(request);
  await connectDB();

  const body = await request.json();
  const problem = await Problem.create({
    slug: body.slug,
    title: body.title,
    level: body.level ?? LEVELS.BACKTRACKING,
    order: body.order ?? 0,
    difficulty: body.difficulty ?? 'medium',
    statement: body.statement ?? '',
    hint: body.hint ?? '',
    starterCode: body.starterCode ?? '',
    inputSpec: body.inputSpec ?? [],
    argCount: body.argCount ?? 1,
    functionName: body.functionName ?? 'solve',
    functionSignature: body.functionSignature ?? '',
    returnType: body.returnType ?? 'void',
    useFunctionMode: body.useFunctionMode ?? true,
    maxProbes: body.maxProbes ?? 100,
    probeCooldownMs: body.probeCooldownMs ?? 3000,
    exampleInputs: body.exampleInputs ?? [],
    exampleOutputs: body.exampleOutputs ?? [],
    samples: body.samples ?? [],
    hiddenTests: body.hiddenTests ?? [],
    referenceSolution: body.referenceSolution ?? '',
    points: body.points,
    timeLimitMs: body.timeLimitMs,
    memoryMb: body.memoryMb,
    comparison: body.comparison,
    status: body.status ?? PROBLEM_STATUS.DRAFT,
  });

  return ok(problem, 201);
});
