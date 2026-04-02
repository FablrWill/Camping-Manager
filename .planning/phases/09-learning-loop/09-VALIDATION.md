---
phase: 9
slug: learning-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed in Phase 8 Wave 0) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | LEARN-01 | unit | `npx vitest run tests/usage-tracking.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | LEARN-01 | integration | `npx vitest run tests/usage-tracking.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | LEARN-02 | unit | `npx vitest run tests/trip-summary.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | LEARN-03 | unit | `npx vitest run tests/voice-debrief.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/usage-tracking.test.ts` — stubs for LEARN-01 (batch PATCH, usage status values)
- [ ] `tests/trip-summary.test.ts` — stubs for LEARN-02 (auto-generate trigger, Claude prompt)
- [ ] `tests/voice-debrief.test.ts` — stubs for LEARN-03 (TripFeedback persistence)

*Vitest already installed from Phase 8 Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Usage tracking UI renders radio buttons per packed item | LEARN-01 | Visual layout, touch targets | Open past trip → verify each item shows 3 status options |
| Auto-generated summary appears after all items marked | LEARN-02 | Requires Claude API call + UI timing | Mark all items → verify summary auto-renders within 5s |
| Voice debrief modal shows extracted changes with checkboxes | LEARN-03 | Audio recording + modal interaction | Record voice note → verify modal appears with selectable changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
