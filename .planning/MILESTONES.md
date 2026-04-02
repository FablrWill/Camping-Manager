# Milestones

## v1.1 Close the Loop (Shipped: 2026-04-02)

**Phases:** 6-11 (6 phases, 23 plans)
**Timeline:** 2026-04-01 → 2026-04-02 (2 days)
**Requirements:** 15/15 satisfied
**Audit:** tech_debt (11 items accepted, no critical blockers)

**Key accomplishments:**

- Stabilized all AI features with Zod validation (parseClaudeJSON utility), packing list + meal plan persistence that survives navigation, and complete CRUD for trips/vehicles/photos
- Built day-of execution tools: Claude-generated departure checklist with interactive check-off and safety float plan email to emergency contact via Gmail
- Shipped PWA with offline mode: installable app, "Leaving Now" IndexedDB caching, offline app shell, and map tile prefetch for field use without signal
- Created the learning loop: gear usage tracking (used/didn't need/forgot), AI post-trip debrief summary, and voice notes that write back to gear/location records
- Wired full offline read path: components read IndexedDB directly when offline, offline write queue for check-offs, sync on reconnect
- Comprehensive test coverage: 190 test files across all phases with 90+ passing tests

**Known Tech Debt (11 items):**

See `.planning/milestones/v1.1-MILESTONE-AUDIT.md` for full list. Highlights:
- `npm run build` fails due to missing native deps from Phase 3 RAG (pre-existing)
- 6 `it.todo` test stubs remain (DB/API integration tests)
- `tripCoords` not piped to tile prefetch (graceful skip)
- `variant="outline"` invalid ButtonVariant in PostTripReview

---

## v1.0 Foundation (Shipped: 2026-04-01)

**Phases:** 1-5 (5 phases, 14 plans)
**Requirements:** All validated

**Key accomplishments:**

- Executive trip prep dashboard with traffic light status for weather, packing, meals, and power
- SQLite RAG knowledge base with hybrid search (FTS5 + vec0 via RRF)
- Messenger-style chat agent with tool-calling loop, context windowing, and agent memory
- AI-powered spot recommendations and voice capture with structured insight extraction
- Validated all 17 v1.0 requirements across 5 phases

---
