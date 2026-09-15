# Backtracking Arena — Developer & Architecture Guide 💻

This document details the engineering architecture, internal subsystems, data models, sandbox mechanics, and deployment workflows for the **Backtracking Arena**.

---

## 1. System Architecture Overview

Backtracking Arena is built with:
- **Framework:** Next.js 15 (App Router, React 19)
- **Runtime & Socket Engine:** Node.js with a custom server (`server.js`) attaching Socket.IO on the `/arena` namespace
- **Database:** MongoDB via Mongoose
- **Styling:** Vanilla CSS + Tailwind CSS 4 design tokens
- **Judge & Sandbox:** Linux bubblewrap (`bwrap`) + resource limits (`prlimit`) executing isolated GCC builds and binaries

```
                          Contestant Browser
                          [Terminal | Editor]
                                   │
                     HTTP REST     │     WebSocket (Socket.IO)
                     & Probes      │     Real-time Leaderboard
                                   ▼
                       Node.js Server (server.js)
                      ┌─────────────────────────┐
                      │  App Router API Routes  │
                      │  - /api/arena/probe     │
                      │  - /api/arena/submit    │
                      │  - /api/arena/problems  │
                      └────────────┬────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
        Probe Queue (Conc: 2)              Judge Queue (Conc: N)
        [probeQueue.js]                    [queue.js]
                │                                     │
                ▼                                     ▼
        Reference Solution Runner             Contestant Solution Judge
        - ephemeral tmpdir                   - generateCWrapper (if funcMode)
        - execSandbox (bwrap)                - gcc compile in bwrap
        - stdout capture                     - test plan execution & diffing
```

---

## 2. Directory Structure

```
backtracking/
├── docs/                        # Documentation suite (Player, Admin, Developer)
├── scripts/
│   ├── problemCards.js          # Default problem card definitions
│   ├── seedProblems.js          # Problem seeder & reference runner
│   ├── seedContest.js           # Contest initialization script
│   └── testJudge.js             # Linux sandbox unit test suite
├── server.js                    # Custom Node server with Socket.IO attachment
└── src/
    ├── app/                     # Next.js App Router
    │   ├── admin/               # Admin console page
    │   ├── arena/               # Arena home & problem workspace [slug]
    │   └── api/arena/           # REST API endpoints
    │       ├── contest/
    │       ├── problems/
    │       ├── probe/           # Blackbox probe endpoint
    │       ├── submissions/
    │       └── leaderboard/
    ├── components/              # React UI components
    │   ├── admin/               # Admin dashboard sub-components
    │   ├── BlackboxTerminal.js  # Interactive probe terminal
    │   ├── CodeEditor.js        # LeetCode-style code editor
    │   ├── ProblemWorkspace.js  # Resizable split workspace
    │   ├── ArenaLeaderboard.js  # Multi-batch live leaderboard
    │   └── VerdictPanel.js      # Results and test case diffs
    ├── lib/
    │   ├── judge/               # Judge subsystem
    │   │   ├── sandbox.js       # bwrap + prlimit runner
    │   │   ├── compile.js       # gcc compilation harness
    │   │   ├── functionWrapper.js # C wrapper generator for LeetCode mode
    │   │   ├── queue.js         # Submission judge queue
    │   │   ├── probeQueue.js    # Dedicated probe queue
    │   │   └── index.js         # Public judge API
    │   ├── probeRateLimit.js    # Probe throttling & cooldowns
    │   ├── rateLimit.js         # Submission rate limiter
    │   ├── scoring.js           # Scoring & tie-breaking logic
    │   └── realtime.js          # Socket.IO broadcasting
    └── models/                  # Mongoose data models
        ├── Problem.js
        ├── Contest.js
        ├── Submission.js
        └── ProbeLog.js
```

---

## 3. Judge & Sandbox Mechanics (Linux)

The sandbox executes untrusted contestant code without virtual machines or Docker overhead using Linux kernel primitives:

### bubblewrap (`bwrap`)
1. **Filesystem Isolation:**
   - Root filesystem mounted read-only (`--ro-bind /usr /usr`, `--ro-bind /lib /lib`, etc.).
   - Sandboxed workdir mounted at `/work` or binary mounted at `/prog`.
   - `/tmp` is an isolated in-memory `tmpfs`.
   - Network namespace unshared (`--unshare-net`) to completely disable internet and local network access.
2. **Resource Limits (`prlimit`):**
   - `RLIMIT_CPU`: Soft + hard CPU time limits. Prevents infinite loops.
   - `RLIMIT_AS`: Address space cap (e.g., 256MB/512MB). Prevents memory exhaustion attacks.
   - `RLIMIT_FSIZE`: Output file size cap. Prevents filling disk with huge stdout.
   - `RLIMIT_NPROC`: Process limit (max 16). Prevents fork bombs.

---

## 4. LeetCode Function Mode & Wrapper Pipeline

When `problem.useFunctionMode === true`:
1. The contestant only writes a function (e.g. `void solve(int n, int k)`).
2. Before compilation, `generateCWrapper` checks if the source already defines `main()`. If not, it generates:
   - Required standard C library includes.
   - Contestant's code.
   - A hidden driver `int main(void)` that reads inputs matching `problem.inputSpec` via formatted `scanf`, executes the function, and exits cleanly.
3. The raw user source is saved in `Submission.source` for viewing, while the wrapped version is fed to GCC.

---

## 5. Dedicated Queue Architecture

To prevent interactive probing from starving official submission judging:
- **`queue.js` (Submission Queue):** Concurrency scaled to CPU core count. Handles full test suite execution for contest submissions.
- **`probeQueue.js` (Probe Queue):** Concurrency limited to 2. Handles single-input executions of reference solutions.
- **`probeRateLimit.js`:** Enforces 3s per-user cooldown and 100 probe quota per problem per user.

---

## 6. Development & Testing Commands

```bash
# Install dependencies
npm install

# Run database & problem seeders
npm run seed:problems
npm run seed:contest

# Run sandbox tests (on Linux)
npm run test:judge

# Start development server
npm run dev

# Start production custom server
npm run build
npm start
```
