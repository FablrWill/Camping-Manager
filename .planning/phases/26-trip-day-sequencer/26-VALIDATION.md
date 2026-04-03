---
phase: 26
slug: trip-day-sequencer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | D-09 | unit | `npx vitest run tests/departure-checklist-schema.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | D-10 | unit | `npx vitest run tests/trip-patch-departure-time.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | D-05/D-06 | unit | `npx vitest run tests/departure-checklist-route.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 1 | D-04 | manual-only | — | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/departure-checklist-schema.test.ts` — stubs for D-09 (Zod schema with suggestedTime variants: null, string, absent)
- [ ] `tests/trip-patch-departure-time.test.ts` — stubs for D-10 (PATCH route handler accepts departureTime)
- [ ] `tests/departure-checklist-route.test.ts` — extends existing departure-checklist API tests with fuel stop integration (D-05/D-06)

*Existing Vitest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Setting departureTime does NOT auto-trigger regen | D-04 | Requires browser interaction to verify no network call fires | Set departure time in UI, open DevTools Network tab, confirm no POST to `/api/departure-checklist` fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
