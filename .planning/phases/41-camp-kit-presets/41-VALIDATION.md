---
phase: 41
slug: camp-kit-presets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- lib/__tests__/kit-presets.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- lib/__tests__/kit-presets.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 0 | extractGearIdsFromPackingList logic | unit | `npm test -- lib/__tests__/kit-presets.test.ts` | ❌ W0 | ⬜ pending |
| 41-01-02 | 01 | 1 | Save-as-Kit button + POST /api/kits | manual smoke | — | — | ⬜ pending |
| 41-02-01 | 02 | 0 | computeGearIdsToRemove logic | unit | `npm test -- lib/__tests__/kit-presets.test.ts` | ❌ W0 | ⬜ pending |
| 41-02-02 | 02 | 2 | POST /api/kits/[id]/unapply correctness | manual smoke | — | — | ⬜ pending |
| 41-02-03 | 02 | 2 | Multi-select stacking UI applies both kits | manual smoke | — | — | ⬜ pending |
| 41-03-01 | 03 | 0 | Claude review prompt includes kit context | unit | `npm test -- lib/__tests__/kit-presets.test.ts` | ❌ W0 | ⬜ pending |
| 41-03-02 | 03 | 3 | Ask Claude to review button + response | manual smoke | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/kit-presets.test.ts` — unit tests for pure logic functions (no DB, no network):
  - `extractGearIdsFromPackingList` — Scenario A
  - `computeGearIdsToRemove` — Scenario C
  - Claude review prompt builder — Scenario D

*Existing vitest.config.ts auto-discovers `lib/__tests__/**/*.test.ts` — no config change needed.*

---

## Test Scenarios

**Scenario A: extractGearIdsFromPackingList**
- Given: packingList with 3 `fromInventory=true` items (with gearId) and 2 non-inventory items
- When: `extractGearIdsFromPackingList(packingList)` called
- Then: returns exactly 3 gearIds, no nulls, no duplicates

**Scenario B: Multi-kit apply dedupes (manual smoke)**
- Given: kit A has gearIds [g1, g2], kit B has gearIds [g2, g3]
- When: apply A then apply B to the same trip
- Then: PackingItems contains exactly [g1, g2, g3] — no duplicate g2 row

**Scenario C: computeGearIdsToRemove**
- Given: appliedKits = [kitA {gearIds: [g1, g2]}, kitB {gearIds: [g2, g3]}]
- When: `computeGearIdsToRemove(kitA.gearIds, [kitB.gearIds])` called
- Then: returns [g1] only (g2 shared with kitB, excluded from delete)
- Subcase: all IDs shared → returns []

**Scenario D: Claude review prompt excludes raw gearIds**
- Given: appliedKits with names and resolved gear items
- When: review prompt is built
- Then: prompt contains kit names and gear item names
- Then: prompt does NOT contain raw cuid strings

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Save-as-Kit creates kit with correct gearIds in DB | DB write | Generate packing list → click Save as Kit → check /api/kits response |
| Multi-select applies both kits, dedupes | UI interaction | Apply kitA + kitB → verify PackingItems in DB |
| Remove kit deletes only exclusive items | UI + DB | Apply kitA+kitB → remove kitA → verify g2, g3 remain |
| Claude review appears after preset apply | UI + API | Apply kit → click "Ask Claude to review" → verify gap-focused response |
| Phase 17 usageStatus not cleared by unapply | Data integrity | Create PackingItem with usageStatus set → unapply kit → verify item remains |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
