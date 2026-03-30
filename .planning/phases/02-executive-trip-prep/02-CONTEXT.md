# Phase 2: Executive Trip Prep - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Single "am I ready?" view for an upcoming trip that composes existing weather, packing, meals, and power features into a stepped prep flow. This is composition — stitching four existing sub-features into one executive view, not building new backend logic.

The experience: "It's Wednesday. Saturday trip. Open one view, walk through everything, know I'm ready."

</domain>

<decisions>
## Implementation Decisions

### Prep View Structure
- **D-01:** Scrollable page with collapsible/expandable sections (not tabs or stepper). Each section shows summary when collapsed, full detail when expanded. Matches ADHD-friendly "scan everything at a glance" principle.
- **D-02:** Route is `/trips/[id]/prep` — a real page, not a modal. Supports deep linking, PREP-04 (access from dashboard trip card), and back-button navigation.

### Status Indicators
- **D-03:** Traffic light badges on each section header — emerald (ready), amber (in progress/needs attention), stone/gray (not started). Uses existing design system semantic colors. Satisfies PREP-03.

### Ready Checklist
- **D-04:** The final "Ready Checklist" section is auto-computed from other sections' state, not a separate manual list. Weather alerts → packing ratio → meal plan generated → power surplus/deficit. "I'm Ready to Go" sticky CTA at bottom activates when all sections are green.

### API & Data Architecture
- **D-05:** Prep API endpoint returns structured JSON representing full trip prep state. A future agent/chat interface (Phase 4) should consume this same data shape — don't build it as view-only.
- **D-06:** Section categories are not hardcoded — use a registry/config pattern so the smart device setup step (Phase 3) can slot in without refactoring the prep flow.
- **D-07:** Packing check state reads/writes existing PackingItem model (`packed` boolean, `@@unique([tripId, gearId])`). No new persistence model for packing — the prep flow surfaces what's already there.

### Claude's Discretion
- Section expand/collapse animation approach
- Loading state orchestration (parallel vs sequential API calls for weather/packing/meals/power)
- Error handling UX when one section fails but others succeed
- Whether to auto-expand the first incomplete section on load

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Specs
- `docs/STYLE-GUIDE.md` §Trip Prep Components (lines 317-450) — Full component specs for WeatherCard, PackingList, MealPlan, PowerBudget, and Trip Prep Flow page layout
- `docs/USER-JOURNEY.md` — North star definition of "done enough" and the primary loop

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — PREP-01 through PREP-04 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and dependency info
- `docs/FEATURE-PHASES.md` §Phase 2 Trip Prep — Current build status of sub-features

### Existing Implementation
- `TASKS.md` — Single source of truth for what's built vs. what's next

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/WeatherCard.tsx` — Existing weather display component, ready to embed
- `components/PackingList.tsx` — Existing packing list with checkbox state, progress bar
- `components/MealPlan.tsx` — Existing meal plan display with shopping list
- `components/PowerBudget.tsx` — Existing power budget with planning + live modes
- `components/TripsClient.tsx` — Already imports all four sub-feature components; currently renders them in modals
- `components/ui/index.ts` — UI primitives: Button, Card, Badge, Input, Modal, Chip, EmptyState, PageHeader, StatCard

### Established Patterns
- **Server components fetch, client components render:** `app/*/page.tsx` does Prisma queries, passes data to `*Client.tsx`
- **API routes:** All four sub-feature APIs exist and accept `tripId`, return JSON
- **Dark mode:** CSS custom properties + localStorage, all components already support it
- **Error handling:** State-based inline messages (no `alert()`), try-catch in API routes

### Integration Points
- No `/trips/[id]` route exists yet — needs new dynamic route (`app/trips/[id]/prep/page.tsx`)
- `TripsClient.tsx` trip cards need a "Prepare" link/button to navigate to `/trips/[id]/prep`
- `DashboardClient.tsx` trip cards need same "Prepare" link for PREP-04
- `PackingItem` model already persists check state — prep view reads/writes it directly

</code_context>

<specifics>
## Specific Ideas

- Will described this as "the Wednesday before Saturday experience" — the framing is executive assistant, not task manager
- Style guide already has a full page layout spec including section order, collapsed summary lines, and the sticky "I'm Ready to Go" CTA
- User explicitly wants structured JSON from the prep API so the Phase 4 chat agent can query trip readiness programmatically

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-executive-trip-prep*
*Context gathered: 2026-03-30*
