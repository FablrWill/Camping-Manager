---
phase: 32
slug: deal-monitoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (with jsdom environment) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/gear-price-check-route.test.ts tests/gear-price-check-schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/gear-price-check-route.test.ts tests/gear-price-check-schema.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` passes
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | HA-01 | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 | ⬜ pending |
| 32-01-02 | 01 | 1 | HA-04 | unit | `npx vitest run tests/gear-price-check-schema.test.ts` | ❌ Wave 0 | ⬜ pending |
| 32-02-01 | 02 | 1 | HA-02 | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 | ⬜ pending |
| 32-02-02 | 02 | 1 | HA-03 | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 | ⬜ pending |
| 32-02-03 | 02 | 1 | HA-05 | unit | `npx vitest run tests/gear-price-check-schema.test.ts` | ❌ Wave 0 | ⬜ pending |
| 32-03-01 | 03 | 2 | HA-06 | manual | — | n/a | ⬜ pending |
| 32-03-02 | 03 | 2 | HA-07 | manual | — | n/a | ⬜ pending |
| 32-04-01 | 04 | 2 | HA-08 | manual | — | n/a | ⬜ pending |
| 32-04-02 | 04 | 2 | HA-09 | manual | — | n/a | ⬜ pending |
| 32-04-03 | 04 | 2 | HA-10 | manual | — | n/a | ⬜ pending |
| 32-04-04 | 04 | 2 | HA-11 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gear-price-check-route.test.ts` — covers HA-01, HA-02, HA-03 (GET 200, GET 404, POST 404 on missing gear, POST calls Claude and upserts)
- [ ] `tests/gear-price-check-schema.test.ts` — covers HA-04, HA-05 (Zod schema validates valid output, rejects missing fields, isAtOrBelowTarget null guard)

*Reference: `tests/gear-research-route.test.ts` — exact structural template for both test files*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deals tab visible only for wishlist items | HA-06 | DOM state — requires browser render | Open gear modal for owned item → no Deals tab. Open for wishlist item → Deals tab present |
| Deal badge shows on wishlist card when isAtOrBelowTarget | HA-07 | DOM state — requires browser render | Seed item with active deal, open /gear, verify green "Deal" badge on card |
| Dashboard "Deals (N)" card surfaces active deals | HA-08 | DOM state — requires browser render | Seed deal item, load dashboard, verify collapsible card shows item name + prices |
| Dashboard deal card hides when no active deals | HA-09 | DOM state — requires browser render | Seed no active deals, load dashboard, verify Deals card absent |
| Staleness warning shown after 30 days | HA-10 | Requires time manipulation | Seed price check with checkedAt = 31 days ago, verify stale warning in Deals tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
