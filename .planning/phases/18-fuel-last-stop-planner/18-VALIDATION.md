---
phase: 18
slug: fuel-last-stop-planner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/overpass.test.ts tests/last-stops-route.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/overpass.test.ts tests/last-stops-route.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | FUEL-02 | unit | `npx vitest run tests/overpass.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | FUEL-02 | unit | `npx vitest run tests/overpass.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | FUEL-02 | unit | `npx vitest run tests/overpass.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 1 | FUEL-01 | unit | `npx vitest run tests/last-stops-route.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 1 | FUEL-01 | unit | `npx vitest run tests/last-stops-route.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-03 | 02 | 1 | FUEL-01 | unit | `npx vitest run tests/last-stops-route.test.ts` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 2 | FUEL-03 | manual | — | — | ⬜ pending |
| 18-03-02 | 03 | 2 | FUEL-03 | manual | — | — | ⬜ pending |
| 18-03-03 | 03 | 2 | FUEL-03 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/overpass.test.ts` — stubs for FUEL-02 (haversine distance, fetchLastStops sorting, dedup, unnamed node filtering)
- [ ] `tests/last-stops-route.test.ts` — stubs for FUEL-01 (route handler with mocked prisma + overpass)

*Existing infrastructure covers framework setup (vitest already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card hidden when trip has no location | FUEL-03 | Complex client component with multiple context deps | Navigate to trip prep for trip without location; verify no Fuel card visible |
| Loading skeleton during fetch | FUEL-03 | Visual animation timing | Navigate to trip prep; observe skeleton before data loads |
| "None found nearby" fallback | FUEL-03 | Requires Overpass to return empty results for coords | Test with remote coordinates (e.g., middle of ocean) or mock API |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
