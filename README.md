# SCIS Connect

The SCIS Connect competition platform: **Quiz Mania** (a realtime MCQ quiz) and
**Backtracking Arena** (a sandboxed C judge), merged onto one Next.js +
Socket.IO + MongoDB server so there is exactly one app to deploy.

```
/           Quiz Mania — host or join a live quiz by room code
/quiz/[id]  Quiz detail
/room/[code] Live quiz room
/arena      Backtracking Arena — problem cards + live standings
/arena/[slug] One problem: pattern, code editor, verdict
/admin      Arena contest control (start / extend / freeze / end)
```

## How it works

**Quiz Mania.** A host creates a quiz and opens a room, getting a 6-character
code. Players join by code; the host advances questions manually over
Socket.IO, and a live leaderboard updates as answers come in. Correct answers
(`isCorrect`) never reach the client — they're stripped from every API
response and every socket broadcast.

**Backtracking Arena.** A contestant opens a problem card showing only sample
inputs and the outputs they produce — no algorithm name, no pseudocode. They
write C in the browser and submit. The server compiles it with `gcc` inside a
sandbox, runs the binary once per hidden test, and compares output. Score is
partial credit per test passed; the leaderboard is recomputed from all
submissions and pushed live to every connected browser. An admin controls the
contest clock from `/admin`, and the server's clock is authoritative — the
countdown shown to contestants can't be fooled by their local machine's time.

Both features share one Socket.IO server on one port: quiz events on the
default namespace, arena events on `/arena` — namespaced so the two can never
collide.

## Dependencies

**Runtime (npm):**

| Package | Used for |
| --- | --- |
| `next` | App Router pages, API routes, the production server build |
| `react` / `react-dom` | UI components |
| `mongoose` | Schemas for Quiz, Room, Attempt, Problem, Submission, Contest |
| `socket.io` | Live quiz state and arena leaderboard push |
| `socket.io-client` | Browser side of the above |

**Dev-only:** `tailwindcss` + `@tailwindcss/postcss` (styling), `eslint` +
`eslint-config-next` (linting).

That's the entire npm dependency list — no code-execution or sandboxing
library. Compiling and running untrusted C is done by shelling out to tools
already on the host:

| System tool | Used for |
| --- | --- |
| `gcc` | Compiles each arena submission (`-O2 -std=c11`) |
| `bwrap` (bubblewrap) | Sandboxes the compile and the run — no network, private namespaces, read-only filesystem |
| `prlimit` (util-linux — preinstalled on virtually every Linux distro) | Enforces CPU time, memory and output-size limits before `bwrap` even starts |

**External services:** MongoDB (stores everything), and — in production — the
main SCIS Connect auth project, which issues the JWT the arena verifies. Quiz
Mania's own player identity is a separate, simpler localStorage id and doesn't
need that project.

## Deploying this (for friends / new machines)

This needs a host that runs a **persistent Node process**, not serverless —
Socket.IO holds long-lived connections and the sandbox forks child processes,
neither of which works on Vercel/Netlify-style functions. A small VM or a
platform like Railway/Render/Fly.io (anything that runs `npm start` as a long-
lived process) works.

```bash
git clone <this-repo-url>
cd scis-connect
npm install

# System tools the arena judge needs (Debian/Ubuntu):
sudo apt install -y gcc bubblewrap

# MongoDB — either point at Atlas, or run one locally:
sudo apt install -y mongodb-org   # see MongoDB's own install docs for other distros

cp .env.example .env.local        # fill in MONGODB_URI at minimum
npm run seed:quiz                 # sample quiz
npm run seed:problems             # backtracking cards + generated answer keys
npm run build
npm start                         # or `npm run dev` while testing
```

Two settings must change before real users touch it — see the checklist below.

### Bubblewrap needs unprivileged user namespaces

Check with:

```bash
cat /proc/sys/kernel/unprivileged_userns_clone   # should be 1 (or the file doesn't exist, also fine)
```

Some managed containers and hardened kernels disable this, which breaks the
judge. If your target host is one of those, the fix is isolated to one
function — see "How code is executed" below.

## Verifying it works

| Command | Checks |
| --- | --- |
| `npm run test:judge` | Sandbox correctness and containment. No DB needed. |
| `ARENA_BASE_URL=http://localhost:PORT node scripts/testApi.js` | Auth, contest gate, partial credit, leaderboard, answer-key leakage. Needs the server running. |
| `ARENA_BASE_URL=http://localhost:PORT node scripts/loadTest.js 100` | Throughput with a full field submitting at once. |

Measured on 4 cores / 9GB with `JUDGE_CONCURRENCY=3`, quiz mania and the judge
sharing the box: 100 simultaneous submissions all judged within **13s** (p50
8.4s). That's the pathological case — every contestant hitting submit in the
same instant. Spread across a real contest window the queue never builds up.

## How code is executed

`gcc` and the contestant's binary both run under **bubblewrap**, not Docker —
namespace setup costs ~5ms against Docker's ~300ms, which is what makes ~100
concurrent contestants affordable on a small box. Isolation is layered:

| Layer | Enforces |
| --- | --- |
| `prlimit` | CPU seconds, address space, output file size, open files |
| `bwrap` | No network, private PID/IPC/UTS namespaces, read-only `/usr`, tmpfs `/tmp`, no `/etc` or `/home` |
| Node | Wall-clock kill, stdout byte cap, per-submission run budget |

`scripts/testJudge.js` asserts the containment properties directly: network
egress is refused, `/etc/passwd` is absent, infinite loops become TLE, and a
fork bomb is capped rather than taking the host down.

Two limits are deliberate:

- **`RLIMIT_NPROC` is not used** — it's per-UID, not per-sandbox, so capping it
  below the account's live process count makes every judge run fail outright.
  Fork bombs are contained by the CPU limit and wall-clock kill instead.
- **A submission has a total run budget** (12s default), so a program that
  times out on every test can't pin a worker for `testCount × timeLimit`.

The whole isolation boundary is one function, `execSandbox` in
`src/lib/judge/sandbox.js`. Swapping to Docker (say, because a target host
disables user namespaces) means reimplementing that function alone — run
`npm run test:judge` afterward and it tells you whether the replacement
actually contains anything.

## Scoring (Arena)

Partial credit: each hidden test carries an equal slice of the problem's
points, and a full pass always awards exactly `points`. A contestant's result
for a problem is their best submission; ties resolve to whoever got there
first.

## Adding or changing arena problems

Problems are documents, not code. Add an entry to `scripts/problemCards.js`
and re-run `npm run seed:problems` — the seeder compiles the card's
`referenceSolution` and runs it against every input to produce the expected
output, so a card can never ship an answer key that disagrees with its own
reference. At runtime, `PATCH /api/arena/problems/:slug` edits any field and
`DELETE` archives a card (archived, not dropped, since submissions reference
the slug). `hiddenTests` and `referenceSolution` are `select: false` on the
schema, so a plain `find()` can never leak the answer key — the same way Quiz
Mania hides `isCorrect`.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Combined HTTP + Socket.IO port (default `4000`) |
| `MONGODB_URI` | Mongo connection string |
| `NEXT_PUBLIC_SOCKET_URL` | Origin the browser dials for sockets |
| `CLIENT_ORIGIN` | Socket.IO CORS allowlist (defaults to `*`) |
| `AUTH_JWT_SECRET` | HS256 secret for tokens issued by the auth project (arena) |
| `AUTH_JWT_ISSUER` | Optional `iss` claim to require |
| `ALLOW_DEV_AUTH` | `true` accepts `x-dev-user-id` as identity. **Set `false` in production.** |
| `ADMIN_USER_IDS` | Comma-separated ids allowed to run the arena contest |
| `JUDGE_CONCURRENCY` | Arena submissions judged in parallel (default 3) |
| `JUDGE_SUBMIT_COOLDOWN_MS` | Per-contestant gap between arena submissions (default 5000) |
| `JUDGE_WORKDIR` | Scratch directory for compiles (default `/tmp/arena-judge`) |

## Before a real contest

- [ ] `ALLOW_DEV_AUTH=false` and `AUTH_JWT_SECRET` set, or anyone can claim any identity (including admin)
- [ ] `ADMIN_USER_IDS` set to real ids
- [ ] `npm run test:judge` passes on the actual host, not just here
- [ ] `node scripts/loadTest.js 100` against that host to size `JUDGE_CONCURRENCY`
- [ ] Run **one** instance — the judge queue and the submit rate limiter hold state in-process, same as Quiz Mania's socket state; move all three to Redis together before scaling out
- [ ] Quiz Mania's own socket auth still trusts whatever `playerId` a client sends (a pre-existing gap, not introduced by this merge) — point it at `src/lib/auth.js` before this goes in front of real users

## Layout

```
server.js                        Next + Socket.IO on one port, both features
src/
  app/
    page.js                      Quiz Mania home (+ link into the arena)
    quiz/[id]/, room/[code]/      quiz + live room
    arena/page.js                arena home (problem cards + standings)
    arena/[slug]/page.js         one problem: pattern, editor, verdict
    admin/page.js                arena contest control
    api/quizzes/, api/rooms/     quiz mania API
    api/arena/                   problems, submissions, contest, leaderboard
  components/                    quiz components + arena editor/verdict/leaderboard
  hooks/
    useQuizRoom.js                quiz room subscription
    useArena.js                   arena contest + standings over Socket.IO
  lib/
    db.js                         shared Mongoose connection
    constants.js                  quiz + arena enums and socket event names
    judge/                        arena sandbox, compile, compare, queue
    auth.js                       arena JWT verification + dev fallback
    scoring.js                    arena partial credit + tiebreak
    identity.js, socketClient.js  client-side identity + sockets (both features)
  models/                         Quiz, Room, Attempt, Problem, Submission, Contest
  server/socket/
    index.js                      wires up both the quiz namespace and /arena
    quizHandlers.js, arenaHandlers.js
scripts/
  seedQuiz.js, seedProblems.js    sample data + generated answer keys
  testJudge.js, testApi.js        sandbox and end-to-end checks
  loadTest.js                     concurrent submission benchmark
```
