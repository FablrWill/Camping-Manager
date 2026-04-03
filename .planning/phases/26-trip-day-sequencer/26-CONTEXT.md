# Phase 26: Trip Day Sequencer - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Evolve the existing `/trips/[id]/depart` departure checklist (built in Phase 7) into a time-anchored sequencer. Tasks are tied to a user-set departure time with suggested clock times. Data sources: packing status, meal plan, power budget (EcoFlow), route (drive time + fuel stops). No new pages — this phase enhances the existing depart page.

</domain>

<decisions>
## Implementation Decisions

### Departure Time Input
- **D-01:** Add `departureTime` (DateTime) field to the Trip model. Set on the trip itself (trip card or prep page input). This is the anchor for the entire sequence — without it, tasks fall back to relative slot labels.
- **D-02:** Full date + time granularity (e.g., "Fri Apr 18 7:00 AM"). Enables actual clock times in the sequence ("Pack cooler by 9:00 PM Thursday", "Leave by 7:00 AM").

### Page Scope
- **D-03:** Enhance the existing `/trips/[id]/depart` page — it becomes the full sequencer. No new page, no "Departure Day" section added to the prep page. The depart page link from trip prep remains the entry point.
- **D-04:** Regen is explicit only (user presses Regenerate). Setting a departure time does NOT auto-trigger regen. Follows Phase 6 D-01/D-02 persistence pattern.

### Route Task Generation
- **D-05:** Route contributes a "Leave by X" task. Claude derives departure deadline from trip location coordinates (no origin address required). Phrased as "Leave by [time] to reach [destination]."
- **D-06:** If Phase 18 fuel/grocery stop cards exist for this trip, include a reminder task in the sequence (e.g., "Stop at Ingles before taking 26E — last resupply point").

### Task Granularity
- **D-07:** Meal plan → phase-level reminder: "Prep meals (see meal plan)" as one task. Claude adds specificity only for time-sensitive items it spots (e.g., "Marinate meat tonight"). No step-by-step extraction.
- **D-08:** Power → "Charge EcoFlow to 100%". If `currentBatteryPct` is available on the trip, Claude adds context: "Currently at [X]% — needs ~Yh to full."

### Schema Changes
- **D-09:** Extend the existing `DepartureChecklist` JSON shape. Add optional `suggestedTime: string | null` to each item. Backwards compatible — existing checklists without times still render correctly. New checklists include time strings like "9:00 PM", "T-30 min", or "7:00 AM departure".
- **D-10:** Trip model needs `departureTime DateTime?` field and a new migration.

### Claude's Discretion
- Number of time slots and their labels (e.g., "Night Before / Morning Of / 30 Min Out / Go Time")
- Whether to show a "No departure time set" prompt or generate a time-slot sequence anyway
- Exact wording of the "Leave by" route task
- Whether to surface a "departure time not set" warning on the depart page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/07-day-of-execution/07-CONTEXT.md` — All Phase 7 decisions. D-01: slot structure, D-03: check-off persistence, D-04: DB persist/load pattern, D-05: vehicle mod items, D-06: unpacked warnings. Phase 26 extends this work — do not duplicate or conflict.
- `.planning/phases/06-stabilization/06-CONTEXT.md` — D-01/D-02: AI output persistence pattern. Phase 26 follows the same: persist on generate, load on mount, explicit regenerate button.

### Existing Files to Enhance
- `components/DepartureChecklistClient.tsx` — 433 lines. Full departure checklist with check-off, float plan, offline support. Phase 26 adds time display and departure time input.
- `app/api/departure-checklist/route.ts` — 118 lines. API for generate/load/check-off. Phase 26 extends the generation prompt with departure time + route + fuel stop data.
- `app/trips/[id]/depart/page.tsx` — Server component that hydrates DepartureChecklistClient. Needs to pass `departureTime` down.
- `lib/parse-claude.ts` — Contains `DepartureChecklistResult` type. Needs `suggestedTime` added to item schema.

### Schema
- `prisma/schema.prisma` — `DepartureChecklist` model (result JSON, tripId unique). `Trip` model needs `departureTime DateTime?` field. `DepartureChecklist` result JSON shape needs `suggestedTime` per item.

### Existing Related APIs
- `app/api/trips/[id]/route.ts` — Trip PATCH endpoint. Needs to accept `departureTime`.
- Phase 18 fuel/stop data location — downstream researcher should confirm where stop cards are stored (likely `app/api/fuel-stops/` or similar).

</canonical_refs>

<deferred>
## Deferred Ideas

- **Time display format discussion skipped** — Will accepted the recommended approach (absolute clock times where departure time is set, relative slot labels as fallback). Claude has discretion on exact format.
- **Origin-aware drive time** — Skipped for now. Drive time is a rough estimate / "Leave by" note, not turn-by-turn. Origin address data entry deferred to a future phase.
- **Departure time UI placement** — Will left this to Claude's discretion. Reasonable placements: trip prep page header, trip card "..." menu, or a prompt on the depart page itself.

</deferred>
