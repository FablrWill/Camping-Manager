---
phase: 35
slug: meal-planning-shopping-prep-feedback
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run --reporter=verbose` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=verbose`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-schema | 01 | 0 | Schema | unit | `npm test -- --run __tests__/meal-plan` | ❌ W0 | ⬜ pending |
| 35-shopping-api | 01 | 1 | Shopping list API | unit | `npm test -- --run __tests__/meal-plan` | ❌ W0 | ⬜ pending |
| 35-feedback-api | 01 | 1 | Feedback API | unit | `npm test -- --run __tests__/meal-plan` | ❌ W0 | ⬜ pending |
| 35-shopping-ui | 02 | 2 | Shopping tab UI | manual | build check: `npm run build` | ✅ | ⬜ pending |
| 35-prep-ui | 02 | 2 | Prep tab UI | manual | build check: `npm run build` | ✅ | ⬜ pending |
| 35-feedback-ui | 02 | 2 | Feedback buttons | manual | build check: `npm run build` | ✅ | ⬜ pending |
| 35-dashboard | 03 | 3 | Dashboard card | manual | build check: `npm run build` | ✅ | ⬜ pending |
| 35-build | 03 | 3 | Build passes | automated | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/meal-plan/shopping-list.test.ts` — stubs for shopping list generation, merge logic, checkbox persistence
- [ ] `__tests__/meal-plan/meal-feedback.test.ts` — stubs for feedback CRUD and injection into meal plan generation
- [ ] `__tests__/meal-plan/prep-guide.test.ts` — stubs for prep guide generation

*Existing `vitest.config.ts` and test infrastructure cover the framework — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shopping tab checkbox state persists across reload | D-05, D-07 | Browser localStorage / DB persistence, no headless test | Load trip, generate shopping list, check items, reload page, verify checked state preserved |
| Copy-to-clipboard produces plain text | D-06 | Clipboard API requires browser interaction | Click copy button, paste into Notes, verify all items appear as plain text |
| Feedback thumbs reveal textarea on tap | D-02 | React interaction state | Tap 👍 on a meal card, verify textarea appears; tap again, verify toggle behavior |
| Prep guide empty state shown before generation | D-08 | UI state | Navigate to Prep tab before generating, verify empty state copy shown |
| Dashboard shows soonest upcoming trip status | D-10, D-11 | Requires live data in DB | Ensure a trip with future date exists, verify dashboard card shows correct trip name and status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
