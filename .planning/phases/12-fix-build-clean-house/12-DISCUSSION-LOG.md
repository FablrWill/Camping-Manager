# Phase 12: Fix Build & Clean House - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 12-fix-build-clean-house
**Areas discussed:** Build fix approach, Test stub handling, Tech debt priority, Gemini review strategy, Gemini review format, Build verification

---

## Build Fix Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Webpack externals only | Add better-sqlite3 and sqlite-vec to serverExternalPackages in next.config.ts. Simplest fix. | ✓ |
| Dynamic imports + externals | Also wrap Prisma calls in dynamic imports for tree-shaking. | |
| You decide | Claude picks the minimal fix. | |

**User's choice:** Webpack externals only
**Notes:** Simplest approach — just serverExternalPackages in next.config.ts.

---

## Test Stub Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Implement all stubs | Write real tests for all 6 stubs. Remove usageStatus test if low-value. | ✓ |
| Remove all stubs | Delete all it.todo stubs and usageStatus test. | |
| Triage case-by-case | Evaluate each stub individually. | |

**User's choice:** Implement all stubs
**Notes:** Ship with actual coverage. Remove usageStatus test if low-value.

---

## Tech Debt Priority

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel agents | Run BUILD-03 through BUILD-07 as parallel agents after BUILD-01/02 passes. | ✓ |
| Sequential, one at a time | Fix them one by one in numbered order. | |
| Cherry-pick priority | UX-facing first, defer infra ones if time tight. | |

**User's choice:** Parallel agents
**Notes:** All are independent and low-risk — parallelize for speed.

---

## Gemini Review Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Full codebase + structured prompt | Send all app/, components/, lib/ files with severity-based prompt. | ✓ |
| Targeted review areas | Only send specific areas with focused questions. | |
| You decide | Claude structures the review. | |

**User's choice:** Full codebase + structured prompt
**Notes:** Comprehensive review — send everything.

---

## Gemini Review Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Concurrent with tech debt | Start review on existing code while BUILD-03-10 are being fixed. | ✓ |
| After all fixes | Wait until all builds pass, then send clean codebase. | |

**User's choice:** Concurrent with tech debt
**Notes:** Review findings go to Phase 13 anyway — no need to wait.

---

## Gemini Review Format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown report in .planning | Save as GEMINI-REVIEW.md in phase directory. Phase 13 reads directly. | ✓ |
| GitHub issue per finding | Create issues labeled by severity. | |
| You decide | Claude picks the most consumable format. | |

**User's choice:** Markdown report in .planning
**Notes:** Simple, keeps everything in the planning directory.

---

## Build Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Full pipeline | npm run build + lint + tsc --noEmit + npm test. | ✓ |
| Build only | Just npm run build. | |
| Build + tests | Build and test, skip lint/type-check. | |

**User's choice:** Full pipeline
**Notes:** Catch type errors and regressions, not just build success.

---

## Claude's Discretion

- Settings placeholder (BUILD-05): Claude decides replace vs remove
- Gemini review prompt structure: Claude designs the prompt

## Deferred Ideas

None — discussion stayed within phase scope.
