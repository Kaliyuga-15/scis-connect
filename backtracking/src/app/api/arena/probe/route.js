import { connectDB } from '@/lib/db';
import { Problem } from '@/models/Problem';
import { Contest } from '@/models/Contest';
import { ProbeLog } from '@/models/ProbeLog';
import { ok, fail, withErrors, DEFAULT_CONTEST_KEY } from '@/lib/api';
import { requireIdentity } from '@/lib/auth';
import { claimProbeSlot, releaseProbeSlot } from '@/lib/probeRateLimit';
import { enqueueProbe } from '@/lib/judge/probeQueue';
import { runProgramOnInputs } from '@/lib/judge';
import { PROBLEM_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const validateInputBounds = (inputStr, inputSpec) => {
  if (!inputSpec || inputSpec.length === 0) return { valid: true };

  const tokens = inputStr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < inputSpec.length) {
    return {
      valid: false,
      message: `Expected ${inputSpec.length} argument(s), but received ${tokens.length}.`,
    };
  }

  for (let i = 0; i < inputSpec.length; i++) {
    const spec = inputSpec[i];
    const token = tokens[i];
    const type = (spec.type || 'int').toLowerCase();

    if (type === 'int' || type === 'long') {
      const val = Number.parseInt(token, 10);
      if (Number.isNaN(val)) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" must be an integer, got "${token}".`,
        };
      }
      if (spec.min !== null && spec.min !== undefined && val < spec.min) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" is below minimum bound ${spec.min}.`,
        };
      }
      if (spec.max !== null && spec.max !== undefined && val > spec.max) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" exceeds maximum bound ${spec.max}.`,
        };
      }
    } else if (type === 'float' || type === 'double') {
      const val = Number.parseFloat(token);
      if (Number.isNaN(val)) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" must be a number, got "${token}".`,
        };
      }
      if (spec.min !== null && spec.min !== undefined && val < spec.min) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" is below minimum bound ${spec.min}.`,
        };
      }
      if (spec.max !== null && spec.max !== undefined && val > spec.max) {
        return {
          valid: false,
          message: `Argument "${spec.name || `arg${i + 1}`}" exceeds maximum bound ${spec.max}.`,
        };
      }
    }
  }

  return { valid: true };
};

// GET /api/arena/probe?key=...&problemSlug=...
// Returns probe quota status and recent probe logs for the authenticated user
export const GET = withErrors(async (request) => {
  const identity = requireIdentity(request);
  await connectDB();

  const contestKey = request.nextUrl.searchParams.get('key') ?? DEFAULT_CONTEST_KEY;
  const problemSlug = request.nextUrl.searchParams.get('problemSlug');

  if (!problemSlug) return fail('problemSlug is required');

  const problem = await Problem.findOne({ slug: problemSlug }).select('maxProbes probeCooldownMs');
  if (!problem) return fail('Problem not found', 404);

  const maxProbes = problem.maxProbes || 100;
  const probeLogs = await ProbeLog.find({
    contestKey,
    userId: identity.userId,
    problemSlug,
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  const probesUsed = probeLogs.length;
  const probesRemaining = Math.max(0, maxProbes - probesUsed);

  return ok({
    maxProbes,
    probesUsed,
    probesRemaining,
    cooldownMs: problem.probeCooldownMs || 3000,
    history: probeLogs.map((l) => ({
      input: l.input,
      output: l.output,
      status: l.status,
      createdAt: l.createdAt,
    })),
  });
});

// POST /api/arena/probe
// Body: { contestKey, problemSlug, input }
export const POST = withErrors(async (request) => {
  const identity = requireIdentity(request);
  await connectDB();

  const body = await request.json();
  const contestKey = body.contestKey ?? DEFAULT_CONTEST_KEY;
  const { problemSlug, input } = body;

  if (!problemSlug) return fail('problemSlug is required');
  if (typeof input !== 'string' || input.length === 0) {
    return fail('Input is required');
  }

  if (input.length > 1024) {
    return fail('Input exceeds 1KB size limit.', 400);
  }

  const contest = await Contest.findOne({ key: contestKey });
  if (!contest) return fail('Contest not found', 404);

  // Contest must be accepting submissions, unless user is admin testing
  if (!contest.isAcceptingSubmissions() && !identity.isAdmin) {
    return fail('The contest is not currently running.', 409);
  }

  // Check if problem is in contest's assigned problem list (Option B: batch problem isolation)
  if (contest.problemSlugs && contest.problemSlugs.length > 0) {
    if (!contest.problemSlugs.includes(problemSlug) && !identity.isAdmin) {
      return fail('This problem is not assigned to your current contest batch.', 403);
    }
  }

  const problem = await Problem.findOne({ slug: problemSlug }).select(
    '+referenceSolution +hiddenTests'
  );
  if (!problem) return fail('Problem not found', 404);
  if (problem.status !== PROBLEM_STATUS.PUBLISHED && !identity.isAdmin) {
    return fail('Problem not found', 404);
  }

  if (!problem.referenceSolution || problem.referenceSolution.trim().length === 0) {
    return fail('No reference solution configured for this black box.', 500);
  }

  // Validate bounds if inputSpec is configured
  const validation = validateInputBounds(input, problem.inputSpec);
  if (!validation.valid) {
    return fail(validation.message, 400);
  }

  const maxProbes = problem.maxProbes || 100;
  const cooldownMs = problem.probeCooldownMs || 3000;

  // Check usage quota
  const currentProbes = await ProbeLog.countDocuments({
    contestKey,
    userId: identity.userId,
    problemSlug,
  });

  if (currentProbes >= maxProbes && !identity.isAdmin) {
    return fail(`You have reached the maximum limit of ${maxProbes} probes for this problem.`, 429);
  }

  // Claim rate limit slot
  const slot = claimProbeSlot(identity.userId, problemSlug, cooldownMs);
  if (!slot.allowed && !identity.isAdmin) {
    return fail(slot.message, 429, { waitMs: slot.waitMs });
  }

  const formattedInput = input.endsWith('\n') ? input : `${input}\n`;
  const startTime = Date.now();

  try {
    const probeResult = await enqueueProbe(() =>
      runProgramOnInputs({
        source: problem.referenceSolution,
        problem,
        inputs: [formattedInput],
        timeLimitMs: 2000,
        memoryMb: 256,
      })
    );

    const durationMs = Date.now() - startTime;

    if (!probeResult.ok) {
      await ProbeLog.create({
        contestKey,
        batch: contest.batch || 'default',
        userId: identity.userId,
        problemSlug,
        input,
        output: 'Error: Execution failed or timed out',
        status: 'error',
        durationMs,
      });

      return fail('Blackbox program encountered a runtime error or timeout on this input.', 400);
    }

    const output = probeResult.outputs[0] || '';

    await ProbeLog.create({
      contestKey,
      batch: contest.batch || 'default',
      userId: identity.userId,
      problemSlug,
      input,
      output,
      status: 'success',
      durationMs,
    });

    const probesUsed = currentProbes + 1;
    const probesRemaining = Math.max(0, maxProbes - probesUsed);

    return ok({
      output,
      probesUsed,
      probesRemaining,
      cooldownMs,
    });
  } finally {
    releaseProbeSlot(identity.userId, problemSlug);
  }
});
