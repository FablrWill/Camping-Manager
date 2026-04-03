# Phase 30: Gear Product Research - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

An AI-powered "Research" tab on gear items that uses Claude to find the top 3 best-in-class alternatives, compare them vs. the owned item (pros/cons + price), and deliver an explicit upgrade verdict. Research results are stored in a new `GearResearch` table with staleness tracking (>90 days). An "Upgrade Opportunities" section on the gear page surfaces items where Claude said "Worth upgrading."

</domain>

<decisions>
## Implementation Decisions

### Storage Model
- **D-01:** New `GearResearch` Prisma model — do NOT extend GearDocument. Research results are structured (alternatives list, pros/cons, verdict) not URL+title pairs. A dedicated table keeps the schema honest.
- **D-02:** One row per GearItem, overwrite on re-research. `researchedAt` field tracks staleness. No history kept — simple and clean.
- **D-03:** Staleness threshold = 90 days (from ROADMAP success criteria).

### Result Format (Claude Output)
- **D-04:** Top 3 alternatives per gear item.
- **D-05:** Explicit upgrade verdict per research run: "Worth upgrading", "Keep what you have", or "Only if budget allows". This is the top-level signal used for surfacing.
- **D-06:** Approximate price range for each alternative (e.g. "$180–220"). Claude notes that prices may be outdated.
- **D-07:** Pros/cons vs. current item for each alternative.
- **D-08:** Claude inputs: `name`, `brand`, `modelNumber`, `category`, `condition`, `price` from GearItem.

### Where Results Live
- **D-09:** New "Research" tab in the gear detail modal, alongside the existing Documents tab. Button in the tab header triggers the research run.
- **D-10:** Stale results (>90 days): show old results with a stale warning banner and a "Re-research" button. Old results remain visible — still useful context.

### Upgrade Surfacing
- **D-11:** Collapsible "Upgrade Opportunities (N)" section on the gear page (not the dashboard). Shows only items where verdict = "Worth upgrading."
- **D-12:** Each entry: gear name → top alternative name + verdict + brief reason. E.g., "Big Agnes Copper Spur → Nemo Hornet Elite — Worth upgrading (lighter, similar price)."
- **D-13:** Clicking an entry opens that gear item's Research tab.

### Claude's Discretion
- Exact Claude prompt design and system prompt for gear research
- How to handle gear items with no brand/modelNumber (graceful degradation)
- Loading state UX during research (spinner, progress message, etc.)
- How alternatives are sorted/ranked (Claude decides ordering)
- GearResearch model field names and JSON structure for alternatives array
- Whether to add a `verdict` enum column or store as a string

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Patterns
- `prisma/schema.prisma` — GearItem model (fields available as Claude inputs), GearDocument model (pattern to follow for GearResearch)
- `lib/claude.ts` — Claude API integration pattern; all research calls must follow this pattern
- `lib/parse-claude.ts` — Zod schema validation for Claude outputs; add GearResearchResultSchema here

### UI Patterns
- `components/GearDocumentsTab.tsx` — Existing tab UI pattern; Research tab should be consistent in structure
- `components/GearClient.tsx` — Gear list, detail modal, and the location where Upgrade Opportunities section will be added

### API Patterns
- `app/api/gear/[id]/` — Route pattern to follow for new `/api/gear/[id]/research` endpoint

No external specs — requirements fully captured in ROADMAP.md success criteria and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/claude.ts`: Established Claude API call pattern with Anthropic SDK — research calls use the same client
- `lib/parse-claude.ts`: Zod-based output validation — add GearResearchResultSchema alongside existing schemas
- `components/GearDocumentsTab.tsx`: Tab UI pattern — Research tab follows the same structure (tab header with action button, content below)
- `components/ui/`: Design system (Card, Modal, Badge) for the Research tab UI

### Established Patterns
- One-to-one relation between GearItem and GearResearch (unlike GearDocument which is one-to-many)
- Claude API calls are server-side (API routes), never client-side
- State-based error messages in components (no alert())

### Integration Points
- `GearItem` ← `GearResearch` (one-to-one via `gearItemId`)
- `GearClient.tsx`: Add "Upgrade Opportunities" section + pass research data to gear detail modal
- `GearDocumentsTab.tsx`: Research tab added as a sibling component in the detail modal

</code_context>

<specifics>
## Specific Ideas

- The upgrade verdict ("Worth upgrading", "Keep what you have", "Only if budget allows") is the primary signal for the Upgrade Opportunities section — it must be a top-level field in the stored result, not buried in prose.
- The user provided a concrete example of what each Upgrade Opportunities entry should look like: "Big Agnes Copper Spur → Nemo Hornet Elite — Worth upgrading (lighter, similar price)"
- Price caveat must be visible in the UI: Claude's price data may be outdated.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-gear-product-research*
*Context gathered: 2026-04-03*
