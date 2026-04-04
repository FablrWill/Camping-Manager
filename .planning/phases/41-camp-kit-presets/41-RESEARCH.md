# Phase 41: Camp Kit Presets / Loadout Templates — Research

**Researched:** 2026-04-04
**Domain:** React component upgrades + Next.js API routes + SQLite/Prisma — no new external dependencies
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Both preset creation paths — manual gear picker (existing in KitPresetsPanel) AND save-from-packing-list ("Save as Kit" button after Claude generates)
- **D-02:** Picker placement = packing list section only — no change to trip creation form
- **D-03:** Multi-kit stacking — explicit multi-select with applied-kits tracker (show which applied, allow remove per kit)
- **D-04:** Claude integration — presets bypass Claude by default; optional "Ask Claude to review" button after applying that flags trip-specific gaps

### Claude's Discretion
- Visual treatment of the "Ask Claude to review" button (amber secondary style or ghost variant)
- Exact wording of Claude's review response (gap-focused, not a full regeneration)
- Whether the applied-kits list shows item counts or just names
- Schema for tracking which preset contributed which packing item (if needed for remove logic — may just clear all kit-sourced items and re-apply remaining kits)

### Deferred Ideas (OUT OF SCOPE)
- Moving the kit picker to trip creation form
- "Preset seeds Claude's prompt" integration mode (Option 3 from discussion)
- Buddy trip mode / split-kit-between-vehicles
</user_constraints>

---

## Summary

Phase 41 upgrades the kit preset system from a single-apply dropdown into a full multi-kit stacking workflow. The existing infrastructure is solid: `KitPreset` model, CRUD API routes, and `apply` route are all production-ready. The work is concentrated in two areas: (1) upgrading `PackingList.tsx` from single-apply to multi-select with applied-kit tracking, and (2) adding two new capabilities — save-from-packing-list and Claude gap review. No schema migration is required; the `gearIds` JSON array on `KitPreset` is sufficient for all cases.

The most architecturally interesting challenge is the "remove kit" inverse operation. The apply route has clean dedup logic (skip existing gear). Remove is harder: when a gear item appears in multiple applied kits, removing one kit must NOT remove that item. The recommended approach is the re-apply strategy: on remove, delete all PackingItems whose gearId was contributed exclusively by the removed kit (not in any other applied kit), then leave items shared with other kits untouched. This avoids needing to track provenance per PackingItem.

The Claude review feature requires a new, lightweight prompt — gap-analysis only, not regeneration. The prompt should receive the applied kit's gear names plus trip context (weather, duration, dog, location type) and respond with bullet points of what's missing, not a full packing list.

**Primary recommendation:** All changes are contained to existing files plus one new API endpoint (`POST /api/kits/[id]/unapply`). No Prisma migration needed.

---

## Standard Stack

### Core (all existing — no new installs required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 | API routes + page rendering | Project standard |
| Prisma | 6.19.2 | KitPreset CRUD, PackingItem operations | Project ORM |
| Anthropic SDK | 0.80.0 | Claude review call | Project AI layer |
| React | 19.2.4 | Component state management | Project standard |
| Tailwind CSS | 4 | Styling — match existing amber/stone palette | Project standard |

### No new packages needed
All required functionality is available through existing dependencies.

---

## Architecture Patterns

### How the Existing Apply Route Works (Verified by reading source)

`POST /api/kits/[id]/apply` — Body: `{ tripId: string }`

1. Fetches the KitPreset by `id`, parses `gearIds` JSON array
2. Queries existing PackingItems for this trip where `gearId IN (kit's gearIds)`
3. Builds `existingSet = new Set(existing.map(e => e.gearId))`
4. `toAdd = gearIds.filter(gid => !existingSet.has(gid))`
5. `createMany` for all gear not already packed
6. Returns `{ added: N, skipped: M, total: T }`

Key insight: **dedup is gear-level, not kit-level.** A gear item that exists in the trip from any source (manual, another kit, Claude) is skipped. This is correct — and the remove logic must respect the same invariant in reverse.

### PackingListResult Shape (Verified by reading lib/claude.ts)

```typescript
// Source: lib/claude.ts lines 13-28
interface PackingListItem {
  name: string
  category?: string
  fromInventory: boolean
  gearId?: string       // only present when fromInventory === true
  reason?: string
}

interface PackingListResult {
  categories: {
    name: string
    emoji: string
    items: PackingListItem[]
  }[]
  tips: string[]
}
```

For "Save as Kit": filter all items where `item.fromInventory === true && item.gearId` across all categories. The resulting `gearId[]` array is the kit's gear list. No schema change needed.

### Recommended Project Structure — New Files

```
app/
  api/
    kits/
      [id]/
        apply/route.ts          (existing — no change)
        unapply/route.ts        (NEW — inverse apply)
      review/route.ts           (NEW — Claude gap analysis)
components/
  KitStackPanel.tsx             (NEW — multi-select kit picker + applied tracker, used inside PackingList)
```

### Pattern 1: Multi-Kit State Model in PackingList.tsx

The current single-apply model uses a `showKitPicker` boolean and a single-use dropdown. The upgrade requires:

```typescript
// New state additions to PackingList.tsx
const [appliedKits, setAppliedKits] = useState<Array<{ id: string; name: string; gearIds: string[] }>>([])
const [showKitPanel, setShowKitPanel] = useState(false)
const [reviewResult, setReviewResult] = useState<string | null>(null)
const [reviewing, setReviewing] = useState(false)
```

The `appliedKits` array is the single source of truth for the "Applied: Weekend Warrior ✕" tracker UI. It lives in React state only — no database schema change needed for tracking which kit contributed what.

### Pattern 2: Remove Kit — Re-Apply Strategy

When removing kit K from appliedKits, the remove logic:
1. Computes `kitGearIds = K.gearIds`
2. Computes `otherKitsGearIds = union of all other applied kits' gearIds`
3. `toRemove = kitGearIds.filter(id => !otherKitsGearIds.has(id))`
4. Calls `DELETE /api/kits/[id]/unapply` with `{ tripId, gearIdsToRemove: toRemove }`

Server-side, the unapply route deletes PackingItems where `tripId = tripId AND gearId IN (gearIdsToRemove)`. This preserves any items shared between kits or added manually by other means.

**Important edge case:** Items that were in the trip BEFORE any kit was applied (e.g., from Claude generation or manual add) must not be removed by unapply. The re-apply strategy handles this automatically because those items are NOT in any kit's `gearIds`, so they won't be in `toRemove`.

### Pattern 3: Save as Kit — Extraction from PackingListResult

```typescript
// Source pattern — inside PackingList.tsx after packingList is set
function handleSaveAsKit(kitName: string) {
  const gearIds = packingList!.categories
    .flatMap(cat => cat.items)
    .filter(item => item.fromInventory && item.gearId)
    .map(item => item.gearId!)

  // POST to /api/kits with { name: kitName, gearIds }
}
```

Only inventory items with a real `gearId` are saved. Custom items (fromInventory: false) are excluded since they have no database record.

### Pattern 4: Claude Review Prompt Design

The review is a separate, lightweight Claude call — NOT a full packing list regeneration. The prompt receives:

- Applied kit gear names (not IDs — Claude doesn't need IDs)
- Trip context: name, dates, location, weather summary, bringingDog
- Instruction: "Review what's packed and flag specific gaps for THIS trip type"

Response format: bulleted list of gaps, NOT a new packing list. Expected response length: 100-300 tokens (fast, cheap).

```typescript
// Pseudo-code for review prompt
const kitSummary = appliedKits
  .map(k => `${k.name}: ${k.gearItems.map(g => g.name).join(', ')}`)
  .join('\n')

const reviewPrompt = `You are reviewing a camping packing list built from kit presets.

APPLIED KITS:
${kitSummary}

TRIP CONTEXT:
- ${tripName}, ${nights} nights
- Location: ${locationName} (${locationType})
- Weather: ${weatherSummary}
${bringingDog ? '- Bringing a dog\n' : ''}

Identify what is MISSING from this kit for this specific trip.
Be specific and brief. List only genuine gaps — not things already covered.
Format: bullet points only. 3-6 items max. No preamble.`
```

### Anti-Patterns to Avoid

- **Tracking provenance per PackingItem via DB column:** Adding a `kitId` or `source` column to `PackingItem` would require a migration and complex logic. The re-apply strategy avoids this entirely.
- **Merging kit picker into the "Generate with Claude" flow:** D-04 explicitly separates these. Keep them as independent actions.
- **Blocking UI during Claude review:** Use the same non-blocking pattern as `handleGenerate` — show a loading spinner in the button, render the review result inline below the applied kits tracker.
- **Removing ALL PackingItems on kit unapply:** Only remove items exclusively contributed by the removed kit, not shared items.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select checkbox UI | Custom state management | Pattern from KitPresetsPanel.tsx (selectedGearIds Set) | Already battle-tested in this codebase |
| JSON dedup logic | Custom set operations | Reuse pattern from apply route (existingSet) | Proven, simple |
| Claude API call | Custom HTTP client | Existing `anthropic` instance from lib/claude.ts | Already configured with error handling |
| Modal/sheet UI | Custom overlay | Existing slide-up pattern from KitPresetsPanel.tsx | Matches project design system |

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a feature addition, not a rename/refactor phase. No runtime state migration required.

---

## Environment Availability

Step 2.6: No new external dependencies. All required tools (Prisma, Anthropic SDK, Next.js) are already installed and verified working.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Anthropic SDK | Claude review call | ✓ | 0.80.0 | — |
| Prisma | KitPreset CRUD, PackingItem ops | ✓ | 6.19.2 | — |
| ANTHROPIC_API_KEY | Claude review | ✓ (production) | — | Disable review button if absent |

---

## Common Pitfalls

### Pitfall 1: Remove Kit Removing Shared Items
**What goes wrong:** User applies "Weekend Warrior" + "Dog Trip". Both contain a leash. User removes "Dog Trip". Leash disappears even though Weekend Warrior also includes it.
**Why it happens:** Naive delete of all kit gearIds without checking overlap.
**How to avoid:** Re-apply strategy — compute `toRemove = kit.gearIds MINUS union(otherKits.gearIds)` before calling unapply endpoint.
**Warning signs:** User reports "items disappeared when removing a kit that another kit also uses."

### Pitfall 2: "Save as Kit" Capturing Non-Inventory Items
**What goes wrong:** Claude suggests "bring firewood" (fromInventory: false). User saves list as kit. Kit includes firewood. On next trip, apply tries to create PackingItem for a null/missing gearId.
**Why it happens:** Not filtering for `item.fromInventory && item.gearId` before extracting gearIds.
**How to avoid:** Filter strictly: `items.filter(i => i.fromInventory === true && i.gearId)`. The POST /api/kits already rejects non-array gearIds but won't catch null entries.
**Warning signs:** Prisma foreign key error when applying a kit — `gearId` references a non-existent GearItem.

### Pitfall 3: appliedKits State Loses Sync After Page Refresh
**What goes wrong:** User applies 2 kits, refreshes page. Applied-kits tracker is blank even though the PackingItems are still in DB.
**Why it happens:** `appliedKits` lives in React state only. There's no DB column tracking which kits are applied to a trip.
**How to avoid:** Acknowledge this is by design (per D-03 discretion — may just clear and re-apply). Document clearly in component comments. OR store applied kit IDs in a Trip field if persistence is needed.
**Decision needed by planner:** Accept ephemeral applied-kits tracker (easier, matches D-03 wording), or persist kit IDs on Trip model (one more field, no migration needed if added as nullable String).
**Recommendation:** Accept ephemeral for Phase 41. Applied-kits tracker is a session UX aid, not permanent data. The PackingItems in DB are the source of truth.

### Pitfall 4: Claude Review Prompt Including Full Gear List = Expensive + Slow
**What goes wrong:** Review prompt sends all gear inventory + full packing list structure = 3000+ tokens in, slow response.
**Why it happens:** Copy-pasting the full packing list generation approach.
**How to avoid:** Send ONLY applied kit gear names (human-readable, not IDs), trip context, and instruction. Target < 500 token input for fast, cheap review.

### Pitfall 5: Phase 17 Feedback Data (usageStatus) on PackingItem
**What goes wrong:** Unapply route deletes PackingItems that have usageStatus feedback attached. Historical feedback data is lost.
**Why it happens:** Simple `deleteMany` without checking usageStatus.
**How to avoid:** In the unapply route, check `usageStatus IS NULL` before deleting, OR only delete PackingItems where `packed = false AND usageStatus IS NULL`. Items with feedback have been through a trip and should not be removed.
**Warning signs:** Post-trip review shows missing feedback after a kit unapply.

---

## Code Examples

### Unapply Route Pattern

```typescript
// Source: based on apply/route.ts pattern — inverse operation
// app/api/kits/[id]/unapply/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.tripId || !Array.isArray(body.gearIdsToRemove)) {
      return NextResponse.json(
        { error: 'tripId and gearIdsToRemove are required' },
        { status: 400 }
      )
    }

    // Only delete items that have no feedback (preserve trip history)
    const { count } = await prisma.packingItem.deleteMany({
      where: {
        tripId: body.tripId,
        gearId: { in: body.gearIdsToRemove },
        usageStatus: null,  // preserve items with feedback
      },
    })

    return NextResponse.json({ removed: count })
  } catch (error) {
    console.error('Failed to unapply kit:', error)
    return NextResponse.json({ error: 'Failed to unapply kit' }, { status: 500 })
  }
}
```

### Save as Kit — Client Extraction Pattern

```typescript
// Source: based on PackingListItem interface in lib/claude.ts
function extractGearIdsFromPackingList(packingList: PackingListResult): string[] {
  return packingList.categories
    .flatMap(cat => cat.items)
    .filter((item): item is PackingListItem & { gearId: string } =>
      item.fromInventory === true && typeof item.gearId === 'string'
    )
    .map(item => item.gearId)
}
```

### Multi-Kit Remove Logic — Client Side

```typescript
// Source: derived from D-03 decision — re-apply strategy
function computeGearIdsToRemove(
  kitToRemove: { id: string; gearIds: string[] },
  remainingKits: Array<{ id: string; gearIds: string[] }>
): string[] {
  const protectedIds = new Set(remainingKits.flatMap(k => k.gearIds))
  return kitToRemove.gearIds.filter(id => !protectedIds.has(id))
}
```

---

## Files That Change

### Modified Files
| File | Change |
|------|--------|
| `components/PackingList.tsx` | Replace single-apply dropdown with multi-select KitStackPanel; add "Save as Kit" UI after packing list is generated; add "Ask Claude to review" button + inline result display |
| `components/KitPresetsPanel.tsx` | No change needed — manual kit creation path already works |

### New Files
| File | Purpose |
|------|---------|
| `components/KitStackPanel.tsx` | Multi-select kit picker slide-up + applied-kits tracker chip list. Self-contained, passed tripId + callback props |
| `app/api/kits/[id]/unapply/route.ts` | POST — removes specific gearIds from a trip's PackingItems (inverse of apply) |
| `app/api/kits/review/route.ts` | POST — Claude gap analysis for applied kits against trip context |
| `lib/__tests__/kit-presets.test.ts` | Unit tests for kit stacking logic and save-as-kit extraction |

### No Schema Migration Required
`KitPreset.gearIds` JSON array handles any number of gear items. `PackingItem` model already has all needed fields. No Prisma migration needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-apply kit dropdown | Multi-select with applied tracker | Phase 41 | UX improvement, same DB |
| No save-from-Claude path | "Save as Kit" button | Phase 41 | New creation path |
| No Claude integration for kits | Optional "Ask Claude to review" | Phase 41 | Additive, not required |

---

## Open Questions

1. **Applied-kits tracker persistence across page refresh**
   - What we know: appliedKits lives in React state only — lost on refresh
   - What's unclear: Is ephemeral acceptable or should it persist?
   - Recommendation: Ephemeral for Phase 41 (matches D-03 wording, PackingItems persist anyway). Note in component comments.

2. **"Save as Kit" name input UX**
   - What we know: Needs a name for the kit
   - What's unclear: Inline input in PackingList, or trigger KitPresetsPanel's create form?
   - Recommendation: Simple inline input with a small modal — a full slide-up sheet would feel heavy for this action. Show a small name input + "Save" button that appears below the generated list.

3. **Claude review endpoint placement**
   - What we know: Needs trip context (name, dates, weather, dog flag)
   - What's unclear: Should review be a new `/api/kits/review` route or extend the existing packing-list route?
   - Recommendation: New dedicated route `/api/kits/review` — keeps concerns separated and is easier to test independently.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- lib/__tests__/kit-presets.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File |
|----------|-----------|-------------------|------|
| Save-from-packing-list extracts only inventory gear (fromInventory=true, gearId present) | unit | `npm test -- lib/__tests__/kit-presets.test.ts` | Wave 0 gap |
| extractGearIdsFromPackingList excludes items with fromInventory=false | unit | same | Wave 0 gap |
| computeGearIdsToRemove returns only IDs not in remaining kits | unit | same | Wave 0 gap |
| computeGearIdsToRemove returns empty when all IDs appear in another kit | unit | same | Wave 0 gap |
| Multi-kit apply deduplicates (applying same kit twice = 0 added second time) | integration/manual | apply route behavior | manual smoke |
| Remove kit leaves items shared with another applied kit intact | unit | same | Wave 0 gap |
| Claude review prompt does not include raw gearIds (sends names only) | unit | same | Wave 0 gap |

### Validation Scenarios (from output spec)

**Scenario A: Save-from-packing-list creates a valid KitPreset**
- Given: packingList with 3 fromInventory items and 2 non-inventory items
- When: extractGearIdsFromPackingList called
- Then: returns exactly 3 gearIds, no nulls, no duplicates

**Scenario B: Multi-kit apply dedupes correctly**
- Given: kit A has gearIds [g1, g2], kit B has gearIds [g2, g3]
- When: apply A, then apply B to same trip
- Then: PackingItems contains exactly [g1, g2, g3] — no duplicate g2

**Scenario C: Remove kit removes only that kit's exclusive items**
- Given: appliedKits = [kitA {gearIds: [g1, g2]}, kitB {gearIds: [g2, g3]}]
- When: remove kitA
- Then: computeGearIdsToRemove returns [g1] only (g2 shared with kitB, g3 belongs to kitB not kitA)
- Then: unapply called with gearIdsToRemove = [g1]
- Then: PackingItems for g2 and g3 remain

**Scenario D: Claude review prompt includes applied kit items as context**
- Given: appliedKits = [{ name: "Weekend Warrior", gearItems: [{name: "Tent"}, {name: "Sleeping Bag"}] }]
- When: review prompt is built
- Then: prompt string contains "Weekend Warrior" and "Tent" and "Sleeping Bag"
- Then: prompt string does NOT contain raw gearId strings (format: cuid, e.g. "clxxx...")

### Wave 0 Gaps
- [ ] `lib/__tests__/kit-presets.test.ts` — covers Scenarios A, B, C, D (pure logic, no DB)
- Existing test infrastructure covers all other patterns; no new config needed

*(Existing vitest.config.ts already includes `lib/__tests__/**/*.test.ts` — new test file auto-discovered)*

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — all new files must be .ts or .tsx
- Functional React components with hooks — no class components
- All API routes must have try-catch with console.error + JSON error response
- No `alert()` in components — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- Immutable patterns — use spread/filter for state updates, never mutate
- Files: 200-400 lines typical, 800 max — KitStackPanel should be a separate component file, not merged into PackingList
- The unapply route must be idempotent — calling it twice should not error, just return removed: 0 on second call
- Production DB safety: no Prisma migrations are needed for this phase, which is a benefit

---

## Sources

### Primary (HIGH confidence)
- `app/api/kits/[id]/apply/route.ts` — verified dedup logic line by line
- `lib/claude.ts` lines 13-28 — verified PackingListResult/PackingListItem shape
- `components/PackingList.tsx` — verified current kit picker state and single-apply flow
- `components/KitPresetsPanel.tsx` — verified gear picker pattern and multi-select checkbox approach
- `prisma/schema.prisma` — verified KitPreset model, PackingItem model, no migration needed
- `app/api/kits/route.ts`, `app/api/kits/[id]/route.ts` — verified CRUD contract

### Secondary (MEDIUM confidence)
- `app/api/packing-list/route.ts` — verified how trip context is assembled; informs Claude review route design
- `vitest.config.ts` — verified test framework and include patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all verified in source
- Architecture: HIGH — read all canonical files, verified exact interfaces
- Pitfalls: HIGH — identified from code reading (Phase 17 feedback field, dedup invariants)
- Test scenarios: HIGH — derived directly from D-03 decisions and code contracts

**Research date:** 2026-04-04
**Valid until:** Stable — no external APIs involved. Valid until schema changes.
