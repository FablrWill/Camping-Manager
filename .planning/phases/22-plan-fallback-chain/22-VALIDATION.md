---
phase: 22
slug: plan-fallback-chain
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 0 | FALLBACK-01–05 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | FALLBACK-01 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | FALLBACK-02 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 1 | FALLBACK-03 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-04 | 02 | 1 | FALLBACK-05 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | FALLBACK-03 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |
| 22-04-01 | 04 | 2 | FALLBACK-02 | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fallback-chain.test.ts` — stubs for FALLBACK-01 through FALLBACK-05

*All fallback logic is concentrated in 2 API routes — one test file covers the entire phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Add Plan B" button visible on trip card | FALLBACK-03 UI | React component rendering | Open /trips, verify badge appears on trips with alternatives |
| Fallback Plans card in trip prep | FALLBACK-02 UI | React component rendering | Open trip prep for a trip with alternatives, verify card renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
