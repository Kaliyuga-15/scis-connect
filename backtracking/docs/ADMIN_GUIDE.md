# Backtracking Arena — Administrator Guide 🛠️

This guide provides event organizers and administrators with comprehensive instructions on setting up, managing, authoring problems, and operating the **Backtracking Arena**.

---

## 1. Accessing the Admin Console

- **URL:** Navigate to `/admin` in your browser.
- **Authentication:** Admin access is gated by the session token / authentication header (`x-dev-user-id` in dev mode, or JWT with `role: 'admin'` in production).
- **Environment Variable:** Ensure `ADMIN_USER_IDS` contains your admin identifiers (comma-separated).

---

## 2. Managing Batches & Contests

Backtracking Arena supports **multi-batch isolation with separate problem sets per batch**.

### Understanding Contests and Batches
Each contest document has:
- `key`: Unique slug identifying the contest (e.g., `arena-batch-a`, `arena-batch-b`).
- `batch`: The batch identifier (e.g., `batch-A`, `batch-B`).
- `problemSlugs`: **Explicit list of problems assigned to this batch.** Only these problems will be visible to contestants in this batch!
- `durationMinutes`: Scheduled contest length.
- `startsAt` / `endsAt`: Authoritative server timestamps.

### Creating a New Contest / Batch
1. Open the Admin Console and select the **Contests & Batches** tab.
2. Click **Create Contest**.
3. Fill in:
   - **Contest Key:** e.g., `backtracking-batch-1`
   - **Contest Title:** e.g., `Backtracking Arena - Morning Batch`
   - **Batch Tag:** e.g., `batch-1`
   - **Duration (minutes):** e.g., `90`
   - **Assigned Problems:** Select which problem cards belong to this batch.
4. Click **Save Contest**.

### Running the Contest
- **Start Contest:** Sets status to `RUNNING` and initializes `startsAt` and `endsAt`. Contestants can now open problems and submit.
- **Extend Contest (+15m / +30m):** Adds time to `endsAt` without disrupting active users.
- **Freeze Submissions:** Prevents new submissions from being scored while keeping the arena accessible for review.
- **End Contest:** Closes the contest window.

---

## 3. Problem Authoring & Management

Navigate to the **Problem Manager** tab in the Admin Console. You can create new problems from scratch or edit existing ones.

### Problem Configuration Fields
| Field | Description | Recommendation |
|---|---|---|
| **Title & Slug** | Human-readable title and unique URL slug. | Use neutral titles (e.g., `Card 1 - Switches`) to prevent spoiling the pattern. |
| **Difficulty** | `easy`, `medium`, or `hard` | Used for UI badges. |
| **Status** | `draft`, `published`, or `archived` | Keep in `draft` until tested; switch to `published` before contest. |
| **Statement** | Optional prose description. | In pattern-inference contests, leave minimal or empty. |
| **Hint** | Optional nudge revealed to contestants. | Provide subtle clues regarding symmetry, line counts, etc. |
| **Points** | Total points for 100% test pass rate. | Standard: 100 to 200 points. |
| **Time Limit** | Max CPU time per test case in ms. | Standard: 2000 ms (2 seconds). |
| **Memory Limit** | Max memory in MB. | Standard: 256 MB. |
| **Max Probes** | Max blackbox tests allowed per user. | Standard: 100 probes. |
| **Probe Cooldown** | Minimum interval between probes. | Standard: 3000 ms (3 seconds). |

---

## 4. Configuring Input Spec & Function Mode

### Input Specification (for Blackbox Terminal)
The **Input Specification** dictates what parameters the black box expects and validates contestant input in real time.

For each parameter, configure:
- **Name:** e.g., `n`, `k`, `target`
- **Type:** `int`, `long`, `float`, `double`, `string`, `array`
- **Min / Max Bounds:** e.g., `min: 1`, `max: 10`
- **Description:** e.g., `Board size (1 to 8)`

### LeetCode-Style Function Mode
Toggle **Use Function Mode** ON:
- **Function Name:** e.g., `solve`
- **Function Signature:** e.g., `void solve(int n, int k)`
- **Return Type:** `void` (if output is printed directly via `printf`) or `int` (if returning a value).

The system generates an automatic C harness:
```c
#include <stdio.h>
#include <stdlib.h>
// ... standard headers ...

// Contestant code is spliced here

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    solve(n, k);
    return 0;
}
```

---

## 5. Reference Solutions & Auto-Generating Outputs

To guarantee that expected outputs can **never drift** from the problem's actual specification:
1. Write the **Reference Solution** in standard C. It must produce the 100% correct output for any valid input.
2. Enter your **Sample Inputs** (e.g., `1\n`, `3\n`) and **Hidden Test Inputs** (e.g., `2\n`, `4\n`, `7\n`, `10\n`).
3. Click **"Test & Regenerate Outputs"**.
4. The system compiles the reference solution in the sandbox, runs all sample and hidden inputs against it, and automatically populates the `expectedOutput` fields!

---

## 6. Monitoring & Exporting the Leaderboard

Navigate to the **Leaderboard & Submissions** tab:
- **Batch Filter:** Switch between batches to view isolated rankings.
- **Drill Down:** Click any contestant to see all their submissions, attempts per problem, verdicts, and execution times.
- **Export to CSV:** Click **Export CSV** to download official contest results with user IDs, names, batch tags, total scores, and problem breakdowns.
