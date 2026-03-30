# Phase 2: Executive Trip Prep - Research

**Researched:** 2026-03-30
**Domain:** Next.js App Router dynamic routes, React composition patterns, prep state aggregation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Scrollable page with collapsible/expandable sections (not tabs or stepper). Each section shows summary when collapsed, full detail when expanded. Matches ADHD-friendly "scan everything at a glance" principle.
- **D-02:** Route is `/trips/[id]/prep` — a real page, not a modal. Supports deep linking, PREP-04 (access from dashboard trip card), and back-button navigation.
- **D-03:** Traffic light badges on each section header — emerald (ready), amber (in progress/needs attention), stone/gray (not started). Uses existing design system semantic colors. Satisfies PREP-03.
- **D-04:** The final "Ready Checklist" section is auto-computed from other sections' state, not a separate manual list. Weather alerts → packing ratio → meal plan generated → power surplus/deficit. "I'm Ready to Go" sticky CTA at bottom activates when all sections are green.
- **D-05:** Prep API endpoint returns structured JSON representing full trip prep state. A future agent/chat interface (Phase 4) should consume this same data shape — don't build it as view-only.
- **D-06:** Section categories are not hardcoded — use a registry/config pattern so the smart device setup step (Phase 3) can slot in without refactoring the prep flow.
- **D-07:** Packing check state reads/writes existing PackingItem model (`packed` boolean, `@@unique([tripId, gearId])`). No new persistence model for packing — the prep flow surfaces what's already there.

### Claude's Discretion

- Section expand/collapse animation approach
- Loading state orchestration (parallel vs sequential API calls for weather/packing/meals/power)
- Error handling UX when one section fails but others succeed
- Whether to auto-expand the first incomplete section on load

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREP-01 | User can view a single "am I ready?" screen for an upcoming trip that shows weather, packing status, meal plan status, and power budget status | New `/trips/[id]/prep` dynamic route; new `/api/trips/[id]/prep` aggregation endpoint pulling from all four existing sub-feature APIs |
| PREP-02 | User can navigate from the executive prep view to each sub-feature (weather details, packing list, meal plan, power budget) and back | Collapsible sections expand in-place (no navigation away); back button works naturally since it's a real page (D-02) |
| PREP-03 | Executive prep view shows clear ready/not-ready indicators for each category | Traffic light Badge components using existing `emerald`/`amber`/`stone` semantic colors (D-03); status computed server-side in prep API |
| PREP-04 | User can access the executive prep flow from the trip card on the home page | `DashboardClient.tsx` and `TripsClient.tsx` trip cards both need a "Prepare" link pointing to `/trips/[id]/prep` |
</phase_requirements>

---

## Summary

This phase is **composition, not construction**. All four sub-feature components (`WeatherCard`, `PackingList`, `MealPlan`, `PowerBudget`) already exist and render correctly. The work is: (1) create a new dynamic route at `/trips/[id]/prep`, (2) create a new `/api/trips/[id]/prep` endpoint that aggregates prep state into a structured JSON shape, (3) build a `TripPrepClient` component that arranges the four sub-features as collapsible sections with traffic-light status badges, and (4) add "Prepare" links to the dashboard and trips page trip cards.

The sub-feature components currently accept `tripId` and `tripName` props and manage their own data fetching internally. The prep page can embed them directly in collapsible wrappers — no re-architecture of those components is needed. The main design challenge is orchestrating section status (how the section header badge knows what to show before the sub-component has loaded its data).

The style guide at `docs/STYLE-GUIDE.md` lines 429–450 specifies the exact page layout, section order, collapsed summary lines, and the sticky "I'm Ready to Go" CTA. That spec is authoritative. Build to it exactly.

**Primary recommendation:** New dynamic route + aggregation API endpoint + `TripPrepClient` wrapper. Embed existing sub-feature components as collapsible sections. Surface status badges derived from the prep API response, not from sub-component internal state.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 | Dynamic route `app/trips/[id]/prep/page.tsx` | Already the project framework |
| React | 19.2.4 | `TripPrepClient.tsx` — collapsible sections, status state | Already used everywhere |
| Prisma | 6.19.2 | Query trip + PackingItems in prep API | Already the ORM |
| Tailwind CSS 4 | via postcss | Traffic light badges, sticky CTA, collapsible animation | Already the styling tool |
| Lucide React | 1.7.0 | Section icons (same ones already used in sub-feature components) | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk` | 0.80.0 | Claude API — already used by packing-list and meal-plan routes | Only if prep API needs to call Claude directly (it doesn't — it reads existing state) |
| Next.js `Link` | built-in | "Prepare" button on trip cards | Standard Next.js navigation — no `router.push` needed for simple links |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Collapsible sections (in-page) | Tabs | Tabs hide content; collapsible sections let Will scan all status at a glance — ADHD-friendly and matches D-01 |
| Real page at `/trips/[id]/prep` | Modal over TripsClient | Modal can't be deep-linked, breaks PREP-04, no back button — ruled out by D-02 |
| Traffic-light Badge component | Custom inline spans | Badge already exists in `components/ui/index.ts` — use it |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/trips/[id]/prep/
  page.tsx                  # Server component: fetch trip + prep state, pass to client
components/
  TripPrepClient.tsx        # Client component: collapsible sections, status badges, sticky CTA
  TripPrepSection.tsx       # Reusable collapsible section wrapper with badge header
app/api/trips/[id]/
  prep/route.ts             # GET endpoint: aggregated prep state JSON (D-05)
```

### Pattern 1: Next.js Dynamic Route (App Router)

**What:** A server component at `app/trips/[id]/prep/page.tsx` receives `params.id`, fetches the trip from Prisma, and passes data + initial prep state to `TripPrepClient`.
**When to use:** Any time you need a real URL with back-button support and deep linking (D-02).

```typescript
// app/trips/[id]/prep/page.tsx
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import TripPrepClient from '@/components/TripPrepClient'

export default async function TripPrepPage({ params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      location: { select: { id: true, name: true, latitude: true, longitude: true } },
      vehicle: { select: { id: true, name: true } },
      packingItems: { select: { packed: true } },
    },
  })

  if (!trip) notFound()

  return (
    <TripPrepClient
      trip={{
        ...trip,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate.toISOString(),
      }}
    />
  )
}
```

### Pattern 2: Prep State Aggregation API (D-05)

**What:** `GET /api/trips/[id]/prep` returns a structured JSON object the prep page and (future) Phase 4 chat agent both consume. Computes status for each section from existing data.
**When to use:** Any time you need machine-readable trip readiness state.

The response shape should look like this (defines the contract Phase 4 depends on):

```typescript
interface PrepState {
  tripId: string
  tripName: string
  startDate: string
  endDate: string
  sections: PrepSection[]
  overallReady: boolean
}

interface PrepSection {
  key: 'weather' | 'packing' | 'meals' | 'power'  // extensible for Phase 3 (D-06)
  label: string
  emoji: string
  status: 'ready' | 'in_progress' | 'not_started'
  summary: string       // collapsed one-liner: "12/28 packed · 3 days to go"
  data: unknown         // section-specific payload for downstream consumers
}
```

Status computation logic (server-side, not in UI):
- **Weather:** `ready` if weather data exists and no severe alerts; `in_progress` if alerts present; `not_started` if no location/can't fetch
- **Packing:** `ready` if all PackingItems are `packed: true` AND at least one exists; `in_progress` if some packed; `not_started` if no PackingItems
- **Meals:** `ready` if meal plan exists (check trip `notes` or separate query); `not_started` otherwise — this is a derived heuristic since meals aren't persisted separately
- **Power:** `ready` if power budget shows surplus; `in_progress` if deficit; `not_started` if no gear with wattage

### Pattern 3: Section Registry / Config (D-06)

**What:** Sections are defined in a config array, not hardcoded JSX. Phase 3 can add a device setup section by appending to the registry.
**When to use:** Any feature with an ordered, extensible list of heterogeneous but structurally similar items.

```typescript
// in TripPrepClient.tsx or lib/prep-sections.ts
const PREP_SECTIONS: SectionConfig[] = [
  { key: 'weather', label: 'Weather', emoji: '🌤', component: WeatherCard },
  { key: 'packing', label: 'Packing List', emoji: '🎒', component: PackingList },
  { key: 'meals', label: 'Meal Plan', emoji: '🍳', component: MealPlan },
  { key: 'power', label: 'Power Budget', emoji: '🔋', component: PowerBudget },
  // Phase 3 inserts: { key: 'devices', label: 'Smart Devices', emoji: '📡', component: DeviceSetup }
]
```

### Pattern 4: Traffic Light Badge Status

**What:** Use the existing `Badge` component from `components/ui/index.ts` with semantic color variants for the three states.
**When to use:** Any status indicator in this phase.

```typescript
// Status → Badge variant mapping
const STATUS_BADGE: Record<PrepStatus, { label: string; className: string }> = {
  ready:       { label: 'Ready',       className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  not_started: { label: 'Not Started', className: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' },
}
```

### Pattern 5: Collapsible Section with Expand/Collapse

**What:** Each prep section has a tappable header row that toggles body visibility. The existing `PackingList`, `WeatherCard`, etc. components slot into the body unchanged.

Recommended animation approach (Claude's discretion): CSS `max-height` transition. Simpler and more reliable on mobile than `height: auto` transitions or framer-motion. Use `overflow-hidden` + `max-h-0`/`max-h-[9999px]` with `transition-all duration-300 ease-in-out`. Avoid layout jank from unmounting/remounting sub-components.

```typescript
function TripPrepSection({ title, emoji, status, summary, defaultExpanded, children }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span>{emoji}</span>
          <span className="font-semibold text-stone-900 dark:text-stone-50">{title}</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          {!expanded && <span className="text-xs text-stone-400">{summary}</span>}
          <ChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} size={16} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[9999px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
```

### Pattern 6: Sticky "I'm Ready to Go" CTA

**What:** Fixed button at the bottom of the viewport on mobile, only active when all sections are `status: 'ready'`.

```typescript
// Sticky footer — only active when all sections are green
<div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-stone-50 dark:from-stone-950">
  <button
    disabled={!overallReady}
    className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
      overallReady
        ? 'bg-emerald-600 text-white active:bg-emerald-700'
        : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
    }`}
  >
    I&apos;m Ready to Go
  </button>
</div>
```

### Pattern 7: "Prepare" Link on Trip Cards (PREP-04)

**What:** Add a `Link` to `/trips/[id]/prep` on trip cards in both `DashboardClient.tsx` and `TripsClient.tsx`.
**When to use:** PREP-04 requires access from the home dashboard trip card. Also add to TripsClient for consistency.

Note: `DashboardClient.tsx` currently does not fetch trip data — it shows static stats. To add a "Prepare" link to a specific upcoming trip, the dashboard server component (`app/page.tsx`) must also query for the next upcoming trip.

### Anti-Patterns to Avoid

- **Deriving badge status from sub-component internal state:** Sub-components are client-only; the section header badge must come from the prep API response passed as a prop, not from trying to observe child component state. Parent cannot read child's `useState`.
- **Forcing sub-components to accept new props for prep-mode:** `WeatherCard`, `PackingList`, `MealPlan`, and `PowerBudget` all have clean existing interfaces. Embed them as-is inside `TripPrepSection` wrappers — don't modify them to add status callbacks.
- **Unmounting/remounting sub-components on collapse:** This would trigger data re-fetches and lose scroll position. Use CSS visibility (max-height) to hide, not conditional rendering.
- **Hardcoding section keys in the prep API:** Violates D-06. Use the registry pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Traffic light status indicators | Custom colored divs | Existing `Badge` from `components/ui/index.ts` | Badge already handles dark mode, sizing, and semantic colors |
| Expand/collapse animation | JavaScript-controlled height | CSS `max-height` transition | No JS overhead, no layout jank, works with varying content height |
| Trip not found handling | Manual if/redirect | Next.js `notFound()` from `next/navigation` | Returns 404 with correct HTTP status; already used in other routes |
| Date formatting | Custom date utilities | Reuse `formatDateRange` and `daysUntil` functions already in `TripsClient.tsx` | Logic already tested and handles edge cases |
| Packing progress calculation | New query | Read existing `PackingItem` records — `packed` boolean already on the model | No schema change needed (D-07) |

**Key insight:** Every visual primitive and all four content components already exist. This phase is wiring, not construction.

---

## Runtime State Inventory

> This is a composition/greenfield-route phase. No renames, migrations, or data model changes are involved (D-07 confirms: use existing PackingItem model as-is). Omitting this section.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code and configuration changes only. No new external services, CLIs, or runtimes are required. All dependencies (Next.js, Prisma, Tailwind, Lucide, Anthropic SDK) are already installed and confirmed working.

---

## Common Pitfalls

### Pitfall 1: Dashboard Has No Trip Data

**What goes wrong:** `DashboardClient.tsx` and `app/page.tsx` currently fetch zero trip data. Adding a "Prepare" link for PREP-04 requires knowing at least the upcoming trip's `id` and `name`. Planner must include a step to add a trip query to `app/page.tsx` (`Promise.all` already used there — extend it).
**Why it happens:** Dashboard was built before trip features were complete; trips were a separate module.
**How to avoid:** `app/page.tsx` adds `prisma.trip.findFirst({ where: { startDate: { gte: new Date() } }, orderBy: { startDate: 'asc' } })` to its existing `Promise.all`.
**Warning signs:** Dashboard trip card shows "0" and links to `/trips` rather than to `/trips/[id]/prep`.

### Pitfall 2: PackingList Component Does Not Persist to DB

**What goes wrong:** The existing `PackingList` component manages check state in local `useState` — it does NOT write `packed: true` to the `PackingItem` table. The prep API reads `PackingItem.packed` to compute packing status. If the user checks off items in `PackingList` but nothing is persisted, the prep API will always report `not_started`.
**Why it happens:** The component was built for interactive use during Phase 1 without persisted checkbox state.
**How to avoid:** Before or as part of this phase, `PackingList` must PATCH `/api/packing-list/[tripId]/items` (or similar) when a checkbox is toggled. Alternatively, the prep page notes this gap and the packing status badge uses a simpler heuristic (e.g., "list generated" = in_progress). **This is a prerequisite gap to resolve during planning.**
**Warning signs:** Packing badge always shows "Not Started" even after checking items.

### Pitfall 3: Meal Plan Has No Persistence Layer

**What goes wrong:** Like PackingList, `MealPlan` generates content via Claude and stores it only in component `useState`. There is no `MealPlan` table in the schema, and no API to read whether a meal plan was previously generated. The prep API cannot query "has a meal plan been generated for this trip?"
**Why it happens:** Meal plan was built as ephemeral on-demand generation.
**How to avoid:** For Phase 2, use a simplified heuristic: check if `Trip.notes` contains a meal plan marker, or use a trip-level boolean flag. The cleaner fix (add `mealPlanGeneratedAt` to `Trip` model) requires a Prisma migration. Planner should choose: add migration or use heuristic. **This is a prerequisite gap to document.**
**Warning signs:** Meals badge always shows "Not Started" regardless of whether meals were generated.

### Pitfall 4: Sub-component Props Mismatch

**What goes wrong:** `PackingList` takes `{ tripId: string; tripName: string }`. `MealPlan` takes `{ tripId: string; tripName: string }`. `WeatherCard` takes `{ days, alerts, locationName?, dateRange?, elevation?, loading?, error? }`. `PowerBudget` takes `{ tripId: string; tripName: string }`. The prep page must pass the right props to each — `WeatherCard` needs pre-fetched weather data, while the others fetch internally.
**Why it happens:** The components were built independently at different times with different data-fetching strategies.
**How to avoid:** The prep page server component should pre-fetch weather (as `TripsClient` already does), then pass it to `WeatherCard` as props. The other three components can fetch internally using `tripId`.
**Warning signs:** TypeScript errors on component props in `TripPrepClient.tsx`.

### Pitfall 5: Sticky CTA Overlaps Bottom Nav

**What goes wrong:** The app has a sticky bottom navigation bar. A sticky CTA at the bottom of the prep page would collide with it.
**Why it happens:** Both elements use `fixed`/`sticky` bottom positioning.
**How to avoid:** Add sufficient bottom padding to the sticky CTA container to clear the nav bar height (check nav bar height in `app/layout.tsx` — it appears to be around 56–64px). Use `pb-[calc(env(safe-area-inset-bottom)+64px)]` or a fixed class that clears the nav.
**Warning signs:** "I'm Ready to Go" button partially hidden behind nav bar on iPhone.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Dynamic Route Pattern (app/api/trips/[id])
```typescript
// No [id] dynamic route exists yet for trips page, but API routes use this pattern.
// Create app/trips/[id]/prep/page.tsx following app/page.tsx + app/trips/page.tsx patterns.
// Use notFound() for missing trips — imported from 'next/navigation'.
```

### Existing Promise.all Pattern (app/page.tsx)
```typescript
// Source: app/page.tsx lines 4-25
const [gearCount, wishlistCount, locationCount, photoCount, vehicleMods, recentGear] =
  await Promise.all([
    prisma.gearItem.count({ where: { isWishlist: false } }),
    // ...
  ])
// Prep page server component should use the same pattern for parallel fetches.
```

### Existing Trip Date Utilities (components/TripsClient.tsx)
```typescript
// Source: components/TripsClient.tsx lines 44-68
function formatDateRange(start: string, end: string): string { ... }
function daysUntil(dateStr: string): number { ... }
function tripNights(start: string, end: string): number { ... }
// Extract to lib/trip-utils.ts so prep page can reuse without importing from a client component.
```

### Existing Error Handling Pattern (all API routes)
```typescript
// Source: app/api/trips/route.ts
try { ... }
catch (error) {
  console.error('Failed to fetch trips:', error)
  return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
}
```

### Existing PackingItem Query (for packing status computation)
```typescript
// Source: prisma/schema.prisma — PackingItem model
// Prep API can compute packing status with:
const packingItems = await prisma.packingItem.findMany({
  where: { tripId },
  select: { packed: true },
})
const packedCount = packingItems.filter(i => i.packed).length
const totalCount = packingItems.length
// status: totalCount === 0 ? 'not_started' : packedCount === totalCount ? 'ready' : 'in_progress'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sub-features in modals (TripsClient) | Real page at `/trips/[id]/prep` | Phase 2 (this phase) | Enables deep linking, back button, PREP-04 from dashboard |
| Status known only inside sub-components | Aggregated prep API response | Phase 2 (this phase) | Phase 4 chat agent can query trip readiness without rendering UI |

**Deprecated/outdated:**
- `TripsClient.tsx` modal-based sub-feature rendering: trip prep content currently opens in modals from the trips page. After this phase, the preferred access point is `/trips/[id]/prep`. The modal flow in TripsClient can remain for editing trip metadata, but sub-feature content belongs on the prep page.

---

## Open Questions

1. **PackingList persistence gap**
   - What we know: `PackingItem.packed` exists in the schema but `PackingList` component does not write to it — it uses local state only.
   - What's unclear: Should this be fixed as part of Phase 2, or should the prep API use a heuristic ("list generated" = in_progress) without relying on packed state?
   - Recommendation: Plan a task to add PATCH endpoint for PackingItem.packed and wire up the checkbox handler in PackingList. This is essential for PREP-03 to be meaningful. Budget 1–2 tasks.

2. **Meal plan persistence gap**
   - What we know: No persistence layer for generated meal plans. The `Trip` model has no `mealPlanGeneratedAt` or similar field.
   - What's unclear: Add a migration (`mealPlanGeneratedAt DateTime?` on Trip), or use a string marker in `Trip.notes`?
   - Recommendation: Add `mealPlanGeneratedAt` to the `Trip` schema. Single-field migration, minimal risk. Cleaner than heuristics and Phase 4 agent can use it.

3. **Dashboard upcoming trip query scope**
   - What we know: Dashboard currently shows zero trip data.
   - What's unclear: Show only the single next upcoming trip, or show multiple? What if there are no upcoming trips?
   - Recommendation: Show one upcoming trip with a "Prepare" CTA. If none, show a "Plan your next trip" link to `/trips`. Handle the zero-state gracefully.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No test framework detected in project |
| Config file | None — Wave 0 must install |
| Quick run command | N/A — see Wave 0 gaps |
| Full suite command | N/A — see Wave 0 gaps |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREP-01 | GET /api/trips/[id]/prep returns sections for weather, packing, meals, power | unit | `npx jest app/api/trips/[id]/prep/route.test.ts` | ❌ Wave 0 |
| PREP-01 | PrepState shape has required fields (tripId, sections, overallReady) | unit | `npx jest lib/prep-state.test.ts` | ❌ Wave 0 |
| PREP-02 | Section expand/collapse renders children | unit | `npx jest components/TripPrepSection.test.tsx` | ❌ Wave 0 |
| PREP-03 | Status badge shows correct color for ready/in_progress/not_started | unit | `npx jest components/TripPrepSection.test.tsx` | ❌ Wave 0 |
| PREP-04 | Dashboard trip card renders Prepare link to /trips/[id]/prep | unit | `npx jest components/DashboardClient.test.tsx` | ❌ Wave 0 |

**Note:** Given this is a personal learning project with no existing test infrastructure, the planner should assess whether to install Jest/React Testing Library or defer automated tests in favor of manual smoke testing. The CLAUDE.md does not mandate a test framework. Treat Wave 0 gaps as optional but flag them.

### Sampling Rate
- **Per task commit:** manual dev-server verification
- **Per wave merge:** manual smoke test of full prep flow
- **Phase gate:** All four sections render, status badges show correctly, sticky CTA activates when all green

### Wave 0 Gaps

These only apply if automated testing is scoped into this phase:
- [ ] `jest.config.ts` — test runner configuration
- [ ] `tests/setup.ts` — React Testing Library setup
- [ ] Install: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest`

*(If no test infrastructure is scoped: "None — manual verification is the phase gate per project conventions")*

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection:
  - `components/WeatherCard.tsx`, `PackingList.tsx`, `MealPlan.tsx`, `PowerBudget.tsx` — verified props interfaces
  - `components/TripsClient.tsx` — verified existing imports of all four sub-components
  - `components/DashboardClient.tsx` — confirmed no trip data fetched currently
  - `prisma/schema.prisma` — confirmed PackingItem.packed, Trip model, no meal plan persistence
  - `app/page.tsx`, `app/trips/page.tsx` — verified server component + Promise.all patterns
  - `app/api/trips/route.ts`, `app/api/weather/route.ts`, `app/api/power-budget/route.ts` — verified API patterns
  - `components/ui/index.ts` — confirmed Badge, Button, Card available
- `docs/STYLE-GUIDE.md` lines 317–450 — authoritative component specs and page layout for Trip Prep
- `docs/USER-JOURNEY.md` — confirms "Wednesday before Saturday" as the core use case
- `docs/FEATURE-PHASES.md` — confirms all four sub-features are ✅ Done

### Secondary (MEDIUM confidence)

- Next.js App Router dynamic route conventions — consistent with CLAUDE.md tech stack declaration (Next.js 16 App Router) and patterns observed in `app/trips/page.tsx`

### Tertiary (LOW confidence)

- None — all findings are based on direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all are installed and in use
- Architecture: HIGH — patterns derived directly from existing working code
- Pitfalls: HIGH — derived from direct inspection of component internals (PackingList localStorage-only state, MealPlan no persistence, DashboardClient no trip data)
- Open questions: MEDIUM — persistence gaps are real and confirmed by code inspection; solutions are straightforward but planner must choose

**Research date:** 2026-03-30
**Valid until:** 2026-05-01 (stable stack, no external dependencies)
