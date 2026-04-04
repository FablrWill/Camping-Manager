---
phase: 34
slug: meal-planning-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (if exists) or package.json |
| **Quick run command** | `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts tests/meal-plan-schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts tests/meal-plan-schema.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-00-01 | 00 | 0 | MEAL-01–07 | unit stub | `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts tests/meal-plan-schema.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-01 | 01 | 1 | MEAL-07 | unit | `npx vitest run tests/meal-plan-schema.test.ts` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 1 | MEAL-07 | unit | `npx vitest run tests/meal-plan-schema.test.ts` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 2 | MEAL-01,02 | unit | `npx vitest run tests/meal-plan-route.test.ts` | ❌ W0 | ⬜ pending |
| 34-02-02 | 02 | 2 | MEAL-03,04,05,06 | unit | `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts` | ❌ W0 | ⬜ pending |
| 34-03-01 | 03 | 3 | MEAL-01–07 | integration | `npm run build` | ✅ | ⬜ pending |
| 34-03-02 | 03 | 3 | MEAL-01–07 | integration | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/meal-plan-route.test.ts` — stubs for MEAL-01 through MEAL-04
- [ ] `tests/meal-regenerate-route.test.ts` — stubs for MEAL-05, MEAL-06
- [ ] `tests/meal-plan-schema.test.ts` — stub for MEAL-07 (SingleMealSchema Zod validation)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meal plan section visible day-by-day in TripPrepClient | MEAL-08 (UI) | Requires browser | Open TripPrepClient for a trip, verify Meal Plan tab shows days |
| Trip card shows "Meal plan ready" / "No meal plan" | MEAL-09 (UI) | Requires browser | Check TripsClient with and without meal plan |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
