---
phase: 29
slug: vehicle-pre-trip-checklist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/vehicle-checklist-schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/vehicle-checklist-schema.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Wave 0 | — | 0 | SC-1, SC-2, SC-3, SC-4 | unit | `npx vitest run tests/vehicle-checklist-schema.test.ts` | ❌ Wave 0 creates | pending |
| Wave 0 | — | 0 | SC-2, SC-4 | unit | `npx vitest run tests/vehicle-checklist-route.test.ts` | ❌ Wave 0 creates | pending |
| SC-1 | — | 1+ | Checklist renders in trip prep | smoke | `npx vitest run tests/vehicle-checklist-schema.test.ts` | ❌ Wave 0 | pending |
| SC-2 | — | 1+ | Item check-off toggles and persists | unit | `npx vitest run tests/vehicle-checklist-route.test.ts` | ❌ Wave 0 | pending |
| SC-3 | — | 1+ | Zod schema validates Claude output | unit | `npx vitest run tests/vehicle-checklist-schema.test.ts` | ❌ Wave 0 | pending |
| SC-4 | — | 1+ | Vehicle specs appear in generation | unit | `npx vitest run tests/vehicle-checklist-route.test.ts` | ❌ Wave 0 | pending |
| SC-5 | — | final | Build passes | build | `npm run build` | ✓ existing | pending |

---

## Wave 0 Gaps (Tests to Create First)

- [ ] `tests/vehicle-checklist-schema.test.ts` — Zod schema validation for `VehicleChecklistResultSchema`
- [ ] `tests/vehicle-checklist-route.test.ts` — check-off PATCH route unit tests

**Patterns to follow:** `tests/departure-checklist-schema.test.ts` and `tests/departure-checklist-route.test.ts`

---

## Phase Gate

Before `/gsd:verify-work`:
1. `npx vitest run` — full suite green
2. `npm run build` — zero errors
3. All Wave 0 test files exist and pass
