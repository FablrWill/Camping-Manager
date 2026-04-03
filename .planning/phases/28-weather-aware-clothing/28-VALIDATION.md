---
phase: 28
slug: weather-aware-clothing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- tests/clothing-guidance.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/clothing-guidance.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` passes
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 0 | SC-01..SC-05 | unit stubs | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | SC-01 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-03 | 01 | 1 | SC-02 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-04 | 01 | 1 | SC-03 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-05 | 01 | 1 | SC-04 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-06 | 01 | 1 | SC-05 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ W0 | ⬜ pending |
| 28-01-07 | 01 | 1 | SC-06 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/clothing-guidance.test.ts` — stubs for SC-01 through SC-05 (unit tests for `buildClothingGuidance()`)

*Existing test infrastructure covers everything else — no new framework install needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
