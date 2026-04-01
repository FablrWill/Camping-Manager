# Phase 7: Day-Of Execution - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Departure tools for an active trip — a time-ordered checklist generated from real trip data (packing list, meal plan, power budget, vehicle mods) and a safety float plan email sent to an emergency contact via Gmail. This phase adds the "am I ready to leave?" execution layer on top of the existing prep flow.

</domain>

<decisions>
## Implementation Decisions

### Departure Checklist Design
- **D-01:** Hybrid approach — fixed time-slot structure (Claude decides the number of slots based on trip complexity) with Claude filling in context-aware details and tips (e.g., "Rain expected — pack tarps in easy-access spot"). Combines predictability with intelligence.
- **D-02:** Checklist lives in both places — summary section on the prep page (`/trips/[id]/prep`) and a full interactive standalone departure page (`/trips/[id]/depart`). Prep page links to the departure page.
- **D-03:** Checklist items are interactive with check-off state. Each item has a checkbox, progress persists, completion percentage shown. Same persistence pattern as Phase 6 AI outputs.
- **D-04:** Persist checklist to DB on generation, load on mount, regenerate button if trip details change. Check-off state survives navigation. Follows Phase 6 D-01/D-02 pattern.
- **D-05:** Vehicle-specific items pulled from vehicle mods — items like "check tire pressure", "verify roof rack secure" based on the vehicle profile. Not just a generic reminder.
- **D-06:** Unpacked packing items appear as highlighted amber warnings in the checklist — surfaces what hasn't been done yet with visual urgency.

### Float Plan Content & Delivery
- **D-07:** Email sent via Nodemailer + Gmail (App Password in .env). User gets a searchable record in Gmail sent folder, and recipients can reply directly. No third-party email service.
- **D-08:** Emergency contact stored with global default in a Settings model, overridable per trip on the Trip model. Most trips use the default, but specific trips can override.
- **D-09:** Claude writes the float plan email text — natural, readable, adapts to trip context (solo vs. group, weather concerns, etc.). Not a fixed template.
- **D-10:** Google Maps link for destination coordinates (no static map image). Future idea: public-facing trip map with campsite notes — deferred.
- **D-11:** Log each float plan send in the database — record when sent, to whom, and content. Useful for "did I send this?" and future learning loop.

### Departure Trigger Flow
- **D-12:** "Send Float Plan" button placement — Claude's discretion on exact placement, but available on the departure page.
- **D-13:** Phase 8 hook preparation — build float plan send as its own action, but design the departure page layout so Phase 8 can easily add "Leaving Now" offline snapshot button next to it later.
- **D-14:** Confirmation before sending — Claude's discretion on whether to use a preview modal or simple confirm dialog.

### Settings & Configuration
- **D-15:** New `/settings` page accessible from top header, housing emergency contact and Gmail configuration. Also serves as foundation for future settings (Phase 8 offline prefs, etc.).
- **D-16:** Inline prompt on first "Send Float Plan" if no emergency contact is configured — guides user to set it up without requiring them to find settings first. Belt and suspenders with the settings page.
- **D-17:** Gmail credentials: App Password stored in .env (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). Documented in setup guide.

### Claude's Discretion
- Number of time slots in the departure checklist template (based on trip complexity)
- Float plan email content level of detail (essential safety vs. full trip brief)
- Confirmation UX for float plan send (preview modal vs. confirm dialog)
- Send Float Plan button exact placement on departure page
- DepartureChecklist data model structure (new model vs. extension)
- Settings page layout and navigation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Architecture
- `.planning/phases/06-stabilization/06-CONTEXT.md` — D-01/D-02: AI output persistence pattern (persist on generate, load on mount, regenerate button). Phase 7 checklist follows this exact pattern.
- `.planning/phases/02-executive-trip-prep/02-CONTEXT.md` — D-01: Scrollable prep page structure, D-07: PackingItem model with packed boolean

### Existing Components
- `components/TripPrepClient.tsx` — Existing prep page that composes weather/packing/meals/power. Departure checklist summary section slots in here.
- `components/PackingList.tsx` — Packing list with check-off UI. Departure checklist follows similar interaction pattern.
- `components/MealPlan.tsx` — Meal plan display. Data source for departure checklist items.
- `lib/power.ts` — Power budget calculator, already generates "Charge Before You Go" tip. Source for power-related checklist items.
- `lib/claude.ts` — Claude API integration with Zod parsing. New checklist generation and float plan composition use this.

### Schema
- `prisma/schema.prisma` — Current Trip, PackingItem, MealPlan, Vehicle, VehicleMod models. Phase 7 adds DepartureChecklist, FloatPlanLog, Settings models.

### Requirements
- `.planning/REQUIREMENTS.md` — EXEC-01 (departure checklist), EXEC-02 (float plan email)

### Codebase Analysis
- `.planning/codebase/CONVENTIONS.md` — API route error handling pattern, component naming, state management patterns
- `.planning/codebase/STRUCTURE.md` — File organization and routing conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/TripPrepClient.tsx` — Prep page framework; departure summary section slots in as a new TripPrepSection
- `components/TripPrepSection.tsx` — Collapsible section component with traffic light badge; reuse for departure summary
- `components/PackingList.tsx` — Check-off pattern with packed state persistence; departure checklist mirrors this UX
- `components/ui/ConfirmDialog.tsx` — Confirmation dialog component; reuse for float plan send confirmation
- `lib/claude.ts` — Claude API wrapper with `parseClaudeJSON<T>` and Zod validation; extend for checklist generation and email composition
- `lib/prep-sections.ts` — Prep section registry pattern; add departure section to the registry

### Established Patterns
- AI output persistence: generate → persist to DB → load on mount → regenerate with confirmation (Phase 6 pattern)
- API routes: try-catch with console.error + JSON error response, Zod validation on Claude outputs
- Client components: useState for local state, useEffect for data fetching, useCallback for handlers

### Integration Points
- `/trips/[id]/prep` page — add departure summary section
- `/trips/[id]/depart` — new standalone departure page (follows `/trips/[id]/prep` routing convention)
- `app/api/` — new routes for departure checklist generation, float plan send, settings CRUD
- `prisma/schema.prisma` — new models for DepartureChecklist, FloatPlanLog, Settings
- `components/TopHeader.tsx` — add settings gear icon link
- `app/settings/` — new settings page

</code_context>

<specifics>
## Specific Ideas

- **Gmail integration rationale:** Will specifically wants emails in his Gmail sent folder for searchability and natural reply threads. Not using a third-party email service.
- **Public trip map:** Will mentioned wanting a public-facing map with campsite notes that could be shared in the float plan email. Deferred for now — start with Google Maps coordinate links.
- **Vehicle-aware checklist:** Pull specific items from vehicle mods (roof rack check, tire pressure, etc.) rather than generic "check your vehicle" reminders.
- **Unpacked item warnings:** Amber-highlighted warnings for items not yet checked off in the packing list, creating urgency in the departure flow.

</specifics>

<deferred>
## Deferred Ideas

- **SOS distress beacon:** An emergency button that sends live location to all emergency contacts and pre-cached local first responders (rangers, fire). Needs offline capability, location services, multi-contact emergency list, and pre-departure caching of local emergency numbers. Major feature — its own phase.
- **Public-facing trip map:** A shareable map with campsite notes, routes, and points of interest that could be linked from the float plan email. Needs its own design pass.
- **Return notification:** An "I'm back" action that notifies the emergency contact when the trip is over. Simple but belongs in a future phase (could tie into Phase 9 learning loop).

</deferred>

---

*Phase: 07-day-of-execution*
*Context gathered: 2026-04-01*
