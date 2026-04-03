---
phase: 17
slug: feedback-driven-packing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | PACK-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | PACK-02 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 2 | PACK-03 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 2 | PACK-04 | manual | manual verify | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/claude.feedback.test.ts` — unit tests for `buildFeedbackSection()` and updated `generatePackingList()` signature (PACK-01, PACK-03)
- [ ] `__tests__/api/packing-list.feedback.test.ts` — integration test for feedback aggregation from `PackingItem.usageStatus` (PACK-02)

*Existing vitest infrastructure already installed — no new framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Packing list output includes feedback-informed note | PACK-04 | Requires live Claude API call with seeded PackingItem data | 1. Seed 2+ trips with PackingItem records having usageStatus=didnt_need. 2. Generate packing list. 3. Verify Claude response includes deprioritization note. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
