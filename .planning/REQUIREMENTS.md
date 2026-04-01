# Requirements: Outland OS — Milestone v1.1

**Defined:** 2026-04-01
**Core Value:** Personal camping second brain — a closed-loop system that plans, executes, and learns from every trip

## v1.1 Requirements

Requirements for v1.1 "Close the Loop." Each maps to roadmap phases.

### Stabilization

- [ ] **STAB-01**: User can generate AI outputs (packing list, meal plan) without crashes from malformed Claude responses (Zod parseClaudeJSON utility)
- [ ] **STAB-02**: User can view previously generated packing lists and meal plans after navigating away (persisted to database)
- [x] **STAB-03**: User can edit and delete trips from the trips page
- [x] **STAB-04**: User can edit vehicle profile and edit/delete vehicle mods
- [x] **STAB-05**: User can delete photos from the photo gallery
- [x] **STAB-06**: All existing forms use the design system UI primitives (Button, Input, Card, Modal) for visual consistency

### PWA / Offline Mode

- [ ] **OFF-01**: User can install the app to their phone's home screen as a PWA
- [ ] **OFF-02**: User can open the app offline and see the app shell (navigation, cached pages)
- [ ] **OFF-03**: User can tap "Leaving Now" on a trip and have all trip data cached for offline use (weather snapshot, packing list, meal plan, spot coordinates, emergency info)
- [ ] **OFF-04**: User can view cached map tiles for trip area while offline (tiles visible at time of "Leaving Now")

### Day-Of Execution

- [ ] **EXEC-01**: User can view a time-ordered departure checklist generated from their trip's packing list, meal plan, and power data
- [ ] **EXEC-02**: User can send a safety float plan email to an emergency contact with trip summary on departure

### Learning Loop

- [ ] **LEARN-01**: User can mark packed items as "used" or "didn't need" after a trip
- [ ] **LEARN-02**: User can view a Claude-generated post-trip summary (what to drop, what was missing, location rating) after completing gear usage tracking
- [ ] **LEARN-03**: User can record a voice debrief that automatically updates gear notes and location ratings

## v2 Requirements (Deferred)

- Feedback-driven packing improvement (needs 3+ trips of history data to be meaningful)
- Dead man's switch safety check-in (needs persistent server infrastructure)
- Full offline map tile pre-download (deep-link to Gaia GPS instead)
- Dog-aware trip planning (waiting for dog arrival + needs assessment)
- Knowledge base expansion (2500+ chunks)
- Deploy to Vercel (database migration when ready)
- Smart campsite / Home Assistant bridge (blocked on hardware)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full region map tile download | 100MB-2GB per region; cache in-viewport tiles only, deep-link Gaia GPS for full offline maps |
| Background check-in timer / dead man's switch | Requires persistent server process; local dev architecture doesn't support it |
| Two-way offline sync / conflict resolution | Single user, local SQLite — no sync conflicts possible |
| Reservation / permit API integration | Recreation.gov API is brittle and high maintenance; paste confirmation URL instead |
| Rich text debrief editor | Adds friction; voice is the input modality, not keyboard |
| Real-time offline sync | Single-user local-first app; offline snapshot is read-only in v1.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 6 | Pending |
| STAB-02 | Phase 6 | Pending |
| STAB-03 | Phase 6 | Complete |
| STAB-04 | Phase 6 | Complete |
| STAB-05 | Phase 6 | Complete |
| STAB-06 | Phase 6 | Complete |
| OFF-01 | Phase 8 | Pending |
| OFF-02 | Phase 8 | Pending |
| OFF-03 | Phase 8 | Pending |
| OFF-04 | Phase 8 | Pending |
| EXEC-01 | Phase 7 | Pending |
| EXEC-02 | Phase 7 | Pending |
| LEARN-01 | Phase 9 | Pending |
| LEARN-02 | Phase 9 | Pending |
| LEARN-03 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 — traceability filled after roadmap creation*
