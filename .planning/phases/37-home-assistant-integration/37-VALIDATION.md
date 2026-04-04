---
phase: 37
slug: home-assistant-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test -- tests/ha-*.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/ha-*.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` passes
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| HA-01 | schema | 1 | Settings token omission | unit | `npm test -- tests/ha-settings.test.ts` | ❌ W0 | ⬜ pending |
| HA-02 | routes | 1 | POST /api/ha/test success | unit | `npm test -- tests/ha-test-route.test.ts` | ❌ W0 | ⬜ pending |
| HA-03 | routes | 1 | POST /api/ha/test 400 unconfigured | unit | `npm test -- tests/ha-test-route.test.ts` | ❌ W0 | ⬜ pending |
| HA-04 | routes | 1 | GET /api/ha/states cached fallback | unit | `npm test -- tests/ha-states-route.test.ts` | ❌ W0 | ⬜ pending |
| HA-05 | routes | 1 | GET /api/ha/states updates cache | unit | `npm test -- tests/ha-states-route.test.ts` | ❌ W0 | ⬜ pending |
| HA-06 | ui | 2 | Entity grouping by domain | unit | `npm test -- tests/ha-entity-grouping.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ha-settings.test.ts` — token omission (HA-01)
- [ ] `tests/ha-test-route.test.ts` — test endpoint success + 400 (HA-02, HA-03)
- [ ] `tests/ha-states-route.test.ts` — cache fallback + cache update (HA-04, HA-05)
- [ ] `tests/ha-entity-grouping.test.ts` — entity domain grouping (HA-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Campsite card polls every 30s | D-03 | Requires real 30s timer | Load dashboard, observe network tab for /api/ha/states calls at 30s intervals |
| "Offline — last updated X ago" display | D-09 | Requires simulated HA outage | Set haUrl to unreachable, verify stale cache values + timestamp shown |
| Entity picker grouping UI | D-07 | Visual grouping verification | Connect to HA, open picker, confirm domain headers render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
