# Phase 12: Parallel Execution Guide

## Overview

Phase 12 has 5 plans. Wave 1 (plans 01-04) can run simultaneously because they touch completely different files. Wave 2 (plan 05) runs after all wave 1 plans are done — it's the verification gate.

You'll spin up 4 Claude Code sessions (one per plan), let them each do their work, then merge them back to main one at a time. Then one final session runs the verification.

## Status Board

> **Each session updates this table when it starts and finishes work.**

| Plan | What It Does | Files It Touches | Status | Session | Machine |
|------|-------------|-----------------|--------|---------|---------|
| 12-01 | Replace raw buttons with design system, fix lint errors | components/PackingList.tsx, MealPlan.tsx, SettingsClient.tsx, + 5 more | in-progress | session-12-01 | Laptop |
| 12-02 | SW cache for trip routes, pipe tripCoords to LeavingNowButton | public/sw.js, depart/page.tsx, DepartureChecklistClient.tsx | done | tender-sinoussi | Laptop |
| 12-03 | Implement test stubs, remove low-value test | tests/usage-tracking.test.ts, tests/trip-summary.test.ts | unclaimed | — | — |
| 12-04 | Run Gemini full-codebase review | .planning/ only (read-only on app code) | unclaimed | — | — |
| 12-05 | Verify build/lint/types/tests all pass, fix ROADMAP, update TASKS.md | .planning/ROADMAP.md, TASKS.md | **blocked** (needs 01-03 done first) | — | — |

## Recommended Assignment

| Plan | Best Machine | Why |
|------|-------------|-----|
| 12-01 | Laptop | Component changes, you might want to check visuals |
| 12-02 | Laptop | Small scope, quick work |
| 12-03 | Mac mini | Test-only work, no UI needed, CPU work |
| 12-04 | Mac mini | Gemini API calls, read-only, network-heavy |

## How To Run Each Session

### Before You Start (Do This Once)

Make sure your main branch is up to date:

```bash
cd ~/Camping\ Manager
git pull origin main
```

On the Mac mini, also run:
```bash
cd ~/Camping\ Manager    # or wherever your repo is
git pull origin main
npm install
```

### For Each Session

1. **Open a new Claude Code session** in the `Camping Manager` directory
2. **Paste the prompt** from the section below
3. **Let it work** — each plan is marked `autonomous: true`, so Claude will do the work without asking you questions
4. **When it finishes**, it will merge to main and push. You'll see a confirmation message.
5. **Then start the next session** — it will see the updated status board

---

## Session Prompt

**Use this same prompt for every session.** Each session reads the status board, picks the next unclaimed plan, claims it, does the work, and merges back. Just copy-paste this into each new Claude Code session:

```
Read docs/PARALLEL-EXECUTION-GUIDE.md — this is Phase 12 parallel execution.

Your job: pick ONE unclaimed plan from the Status Board, execute it, and merge it back.

STEP 1 — CLAIM
- Read the Status Board table in docs/PARALLEL-EXECUTION-GUIDE.md
- Find the first plan with status "unclaimed"
  - If Plan 12-05 is the only one left, check that plans 12-01, 12-02, and 12-03 are all "done" first. If they aren't, tell me and stop.
- Change that plan's status from "unclaimed" to "in-progress"
- Add your session/worktree name in the Session column
- Add which machine you're on (Laptop or Mac mini) in the Machine column
- Commit this change directly to main and push to GitHub
- Then pull the latest main to make sure you have all other sessions' work

STEP 2 — WORK
- Create a worktree for your work
- Read your plan file: .planning/phases/12-fix-build-clean-house/{plan-number}-PLAN.md
- Execute every task in the plan precisely as written
- Only touch files listed in the plan's files_modified — other sessions own other files
- If your plan is 12-04 (Gemini review), make sure GEMINI_API_KEY is set (check ~/.gemini/settings.json or export it)

STEP 3 — VERIFY
- Run the verification steps described in your plan's <verify> blocks
- For any plan: npm test should still pass after your changes
- Do not proceed to merge if verification fails — fix the issue first

STEP 4 — MERGE
- Switch to main: cd to the main repo directory (not the worktree)
- Pull latest: git pull origin main
- Merge your worktree branch: git merge <your-branch> --no-edit
- Push: git push origin main
- If there's a merge conflict in PARALLEL-EXECUTION-GUIDE.md (because another session also updated it), resolve by keeping both status updates

STEP 5 — UPDATE STATUS
- In docs/PARALLEL-EXECUTION-GUIDE.md on main, change your plan's status from "in-progress" to "done"
- If ALL plans (01-05) are now "done", add at the bottom: "Phase 12 COMPLETE — all plans executed and verified."
- Commit and push

That's it. Do one plan, merge, update the board, and you're done.
```

---

## Mac Mini Setup

If you haven't used Claude Code on your Mac mini with this project before:

1. **Pull the latest code:**
   ```bash
   cd ~/Camping\ Manager
   git pull origin main
   npm install
   ```

2. **Verify basics work:**
   ```bash
   npm test          # should pass ~90 tests
   npm run build     # should complete (may have lint warnings, that's ok for now)
   ```

3. **Gemini API key** (needed for Plan 12-04):
   - Check if it's already set: `cat ~/.gemini/settings.json`
   - If not, create the file:
     ```bash
     mkdir -p ~/.gemini
     echo '{"GEMINI_API_KEY": "your-key-here"}' > ~/.gemini/settings.json
     ```
   - Or set the env var: `export GEMINI_API_KEY="your-key-here"`

4. **Start Claude Code sessions** the same way you do on your laptop — `claude` in the terminal from the project directory.

---

## Handling Merge Conflicts

Since each plan touches different files, you should NOT get merge conflicts. But if you do:

1. The session will tell you there's a conflict
2. Look at which file conflicts — it means two sessions accidentally touched the same file
3. This guide file (PARALLEL-EXECUTION-GUIDE.md) is the most likely conflict candidate since every session updates it
4. If the conflict is only in this guide file, resolve it by keeping both status updates
5. If it's in a code file, something went wrong — stop and figure out which sessions overlapped

---

## After Everything Is Done

When all 5 plans show "done" in the status board, Phase 12 is complete. Next steps:

```
/gsd:verify-work 12
```

This runs the formal GSD verification to confirm the phase goal is met.
