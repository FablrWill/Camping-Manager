# Requirements — Outland OS Milestone 1

## v1 Requirements

### Validation & Polish
- [ ] **VAL-01**: User can generate a packing list from trip details and verify it includes weather-appropriate items from their gear inventory
- [ ] **VAL-02**: User can generate a meal plan for a trip and verify it correctly splits home prep vs camp cooking with a shopping list organized by store section
- [ ] **VAL-03**: User can calculate power budget for a trip and verify solar estimates adjust based on weather forecast for trip dates
- [ ] **VAL-04**: User can identify and report bugs in existing AI features (packing, meals, power) and have them fixed before new features are built
- [ ] **VAL-05**: All existing AI features handle edge cases gracefully — empty gear inventory, no weather data, zero-day trips, long trips (7+ days)

### Executive Trip Prep
- [x] **PREP-01**: User can view a single "am I ready?" screen for an upcoming trip that shows weather, packing status, meal plan status, and power budget status
- [x] **PREP-02**: User can navigate from the executive prep view to each sub-feature (weather details, packing list, meal plan, power budget) and back
- [x] **PREP-03**: Executive prep view shows clear ready/not-ready indicators for each category
- [x] **PREP-04**: User can access the executive prep flow from the trip card on the home page

### Knowledge Base (RAG)
- [x] **RAG-01**: System has a curated NC camping knowledge corpus ingested with vector embeddings and full-text search indexes
- [x] **RAG-02**: User can search the knowledge base and get relevant results about NC camping spots, regulations, seasonal info, and local knowledge
- [x] **RAG-03**: Knowledge base search uses hybrid retrieval (vector similarity + keyword matching) for best results
- [x] **RAG-04**: Corpus sources are defined and documented (dispersed camping spots, permit databases, seasonal closures, personal trip notes, etc.)

### Chat Interface
- [x] **CHAT-01**: User can interact with a messenger-style chat agent that has access to the knowledge base, gear inventory, trip data, and saved locations
- [ ] **CHAT-02**: Chat agent can answer questions like "what do I need for a cold-weather trip?" using RAG context + user's gear
- [x] **CHAT-03**: Chat uses streaming responses (SSE) for responsive feel on mobile
- [ ] **CHAT-04**: Chat agent uses tool-use pattern — can query gear, trips, locations, weather, and knowledge base as tools

### AI Trip Recommendations
- [ ] **REC-01**: User can ask "find me a camping spot" with constraints (distance from Asheville, dates, amenities, weather preferences)
- [ ] **REC-02**: Recommendations draw from saved locations + knowledge base + weather forecasts
- [ ] **REC-03**: User can save a recommended spot to their locations from the recommendation result

### Voice Ghostwriter
- [ ] **VOICE-01**: User can record a voice memo (trip debrief / journal entry) from the app
- [ ] **VOICE-02**: Voice recording is transcribed to text automatically
- [ ] **VOICE-03**: Transcription is processed by Claude to extract structured insights (what worked, what didn't, gear feedback, spot ratings)
- [ ] **VOICE-04**: Extracted insights can update gear notes, location ratings, or trip notes automatically
- [ ] **VOICE-05**: Voice input implementation reuses patterns/code from Fablr.ai where applicable

## v2 Requirements (Deferred)

- Executive trip prep: "Download for Offline" pre-trip button
- Smart campsite device registry + Home Assistant bridge (blocked on hardware, ~mid-April)
- Auto-tag photos to trips/locations
- Safety float plan (send trip summary to emergency contacts)
- Gear photo identification (snap photo → Claude identifies)
- Link/screenshot → gear import
- Nearby trails & recreation API
- Fuel & last stop planner
- Permit & registration handling
- Vehicle pre-trip checklist
- Post-trip auto-review (what you forgot, what you didn't use)
- Wear planning (weather-based clothing recommendations)
- Wishlist deal finder
- User guide finder (auto-search product manuals)
- Agent orchestration layer (route tasks to Haiku/Sonnet/Opus by complexity)

## Out of Scope

- Offline/PWA — defer until features stabilize (research says add service worker last)
- Deploy to Vercel — defer until ready for production (SQLite → Postgres is a hard migration)
- Multi-user auth — single user tool
- Dog planning — Will doesn't have the dog yet
- Cost tracking / Gear ROI — nice to have, not core
- Signal map / Seasonal ratings / GPX import / Google Maps import — Phase 2 bonus, not blocking the core loop
- Buddy trip mode / Gear lending — requires multi-user, out of scope
- Shareable trip reports — requires deploy first
- Dark sky / sun / moon — nice to have, not blocking

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| VAL-01 | Phase 1 | TBD | Pending |
| VAL-02 | Phase 1 | TBD | Pending |
| VAL-03 | Phase 1 | TBD | Pending |
| VAL-04 | Phase 1 | TBD | Pending |
| VAL-05 | Phase 1 | TBD | Pending |
| PREP-01 | Phase 2 | TBD | Pending |
| PREP-02 | Phase 2 | TBD | Pending |
| PREP-03 | Phase 2 | TBD | Pending |
| PREP-04 | Phase 2 | TBD | Pending |
| RAG-01 | Phase 3 | TBD | Pending |
| RAG-02 | Phase 3 | TBD | Pending |
| RAG-03 | Phase 3 | TBD | Pending |
| RAG-04 | Phase 3 | TBD | Pending |
| CHAT-01 | Phase 4 | TBD | Pending |
| CHAT-02 | Phase 4 | TBD | Pending |
| CHAT-03 | Phase 4 | TBD | Pending |
| CHAT-04 | Phase 4 | TBD | Pending |
| REC-01 | Phase 5 | TBD | Pending |
| REC-02 | Phase 5 | TBD | Pending |
| REC-03 | Phase 5 | TBD | Pending |
| VOICE-01 | Phase 5 | TBD | Pending |
| VOICE-02 | Phase 5 | TBD | Pending |
| VOICE-03 | Phase 5 | TBD | Pending |
| VOICE-04 | Phase 5 | TBD | Pending |
| VOICE-05 | Phase 5 | TBD | Pending |

---
*Last updated: 2026-03-30 after roadmap creation*
