# Phase 6: Stabilization - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix bugs, persist AI-generated outputs, complete missing CRUD operations, adopt the design system across all forms, and add schema foundations for the learning loop (Phase 9) and offline snapshot (Phase 8). Every existing feature works reliably after this phase — no crashes from malformed AI responses, no lost data on navigation, no visual inconsistency between pages.

</domain>

<decisions>
## Implementation Decisions

### AI Output Persistence
- **D-01:** Persist AI outputs (packing list, meal plan) immediately on generation — no explicit save step. User always has their latest result without extra friction.
- **D-02:** When returning to a previously generated result, show the saved version with a "Regenerate" button. User sees what they had and can refresh if trip details changed.
- **D-03:** Regeneration replaces the previous result — no version history. One packing list and one meal plan per trip. AI-generated outputs aren't worth versioning.
- **D-04:** Regeneration resets individual item check-off state (packed/not packed). New list = clean slate.
- **D-05:** Meal plans follow the identical persist-on-generate + replace pattern as packing lists. One storage pattern for all AI outputs.

### Design System Migration
- **D-06:** Migrate all existing forms to design system primitives in one sweep during this phase. Phase 6 is stabilization — the right time to make everything visually consistent. No incremental per-page approach.
- **D-07:** Adopt existing UI primitives only (Button, Input, Card, Modal, Badge, Chip, EmptyState, PageHeader, StatCard). Do not build new primitives — use the closest existing component for any need.

### Schema Foundations
- **D-08:** PackingItem gets three usage states for post-trip tracking: `used`, `didn't need`, `forgot but needed`. Maps directly to LEARN-01. The "forgot but needed" signal (wasn't packed but should have been) is the most valuable learning data.
- **D-09:** TripFeedback is an append-only model with one record per trip. Fields: summary text, raw voice transcript, extracted insights (structured JSON), applied/pending status. Never update — create a new row if re-debriefed.
- **D-10:** Add a MealPlan model for persisting meal plan results (paralleling packing list persistence). Include in the same migration as PackingItem usage fields and TripFeedback.
- **D-11:** Add an optional `cachedAt` timestamp to key models to support Phase 8's "Leaving Now" offline snapshot. Minimal addition now, avoids a rework migration later.

### Error Resilience
- **D-12:** Malformed Claude responses show an inline error message where the result would appear, with a Retry button. No modal, no navigation disruption. User taps retry, Claude tries again.
- **D-13:** Build a shared `parseClaudeJSON<T>` utility with Zod validation. Validate structure and coerce types (numbers-as-strings, etc.) but don't reject valid-enough responses. Use `.safeParse()` — return 422 for schema mismatches, not 500.
- **D-14:** Add try-catch error handling to all API routes that currently lack it (vehicle, trips, timeline routes per CONCERNS.md). Standardize on the pattern from `app/api/gear/route.ts`.

### Claude's Discretion
- Migration order for form pages (which pages to tackle first)
- MealPlan model field names and JSON structure
- Exact Zod schemas for packing list and meal plan responses
- Whether PackingItem usage is stored as an enum or string field
- TripFeedback JSON insights schema structure
- Which models get the `cachedAt` field (trip-adjacent models most likely)
- Loading state UX during AI regeneration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Documents critical bugs: missing error handling on vehicle/trips routes, raw JSON.parse on Claude responses, placeholder photo issue
- `.planning/codebase/CONVENTIONS.md` — Established code patterns, naming conventions, error handling standards
- `.planning/codebase/STRUCTURE.md` — File organization and component layout

### Design System
- `components/ui/` — All 9 existing UI primitives (Button, Input, Card, Modal, Badge, Chip, EmptyState, PageHeader, StatCard)
- `components/ui/index.ts` — Barrel file exporting all UI components

### Schema
- `prisma/schema.prisma` — Current data model (PackingItem has id/tripId/gearId/packed only, no TripFeedback model)

### Prior Phase Decisions
- `.planning/phases/02-executive-trip-prep/02-CONTEXT.md` — D-07: PackingItem model uses `packed` boolean with `@@unique([tripId, gearId])`
- `.planning/phases/05-intelligence-features/05-CONTEXT.md` — Voice debrief infrastructure exists (VoiceRecordModal, InsightsReviewSheet) for Phase 9 to wire up

### Requirements
- `.planning/REQUIREMENTS.md` — STAB-01 through STAB-06 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/` — 9 UI primitives ready for adoption across all forms
- `lib/claude.ts` — Existing Claude API integration (needs Zod wrapper, not replacement)
- `app/api/gear/route.ts` — Gold standard for error handling pattern (try-catch + console.error + JSON error response)
- `components/VoiceRecordModal.tsx` and `components/InsightsReviewSheet.tsx` — Already import from design system (Button, Badge)

### Established Patterns
- Error handling: try-catch with `console.error('Action:', error)` + `NextResponse.json({ error }, { status })` (gear routes)
- State management: `useState` for local state, no global state management
- Form components: `GearForm.tsx` pattern — modal form with state-based inline errors
- Client components marked with `'use client'` directive

### Integration Points
- `prisma/schema.prisma` — Schema migration adds PackingItem fields, MealPlan model, TripFeedback model, cachedAt timestamps
- `lib/claude.ts` — Wrap with `parseClaudeJSON<T>` utility using Zod
- All `*Client.tsx` components — Design system migration targets
- All `app/api/**/route.ts` without try-catch — Error handling standardization targets

</code_context>

<specifics>
## Specific Ideas

- Schema design must be **offline-aware**: Phase 8's "Leaving Now" snapshot needs to work with these models, so include `cachedAt` fields now rather than retrofitting later
- TripFeedback's structured JSON field should be designed flexibly enough to eventually accommodate Home Assistant sensor data (power usage, temps, cell signal) when that integration arrives in v2.0+

</specifics>

<deferred>
## Deferred Ideas

- **Home Assistant integration** — Will wants the app to ingest real-time camp data from HA: power usage, cell signal, phone location, interior/exterior temps. This is a v2.0+ feature (blocked on hardware per PROJECT.md) but the TripFeedback JSON schema should be designed with extensibility in mind. Consider: HA REST API or webhook push, sensor data as time-series entries in TripFeedback or a dedicated SensorLog model.

</deferred>

---

*Phase: 06-stabilization*
*Context gathered: 2026-04-01*
