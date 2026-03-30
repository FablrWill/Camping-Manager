# Feature Landscape

**Domain:** Personal camping second brain / AI-powered trip assistant
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH (camping-specific apps + general meal/power/offline patterns verified)

---

## Table Stakes

Features users expect from a "camping assistant app." Missing = product feels incomplete or untrusted.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Gear inventory with categories | Every camper manages gear mentally; this externalizes it | Low | Already built |
| Trip creation with dates + destination | Core planning unit | Low | Already built |
| Interactive map of saved spots | Spatial memory is fundamental to camping | Med | Already built |
| Weather at destination | Go/no-go decisions live or die on weather | Low | Already built |
| AI-generated packing list | Solves the #1 anxiety before a trip: "did I forget anything?" | Med | Already built |
| Meal plan per trip | Car campers always plan food; critical for multi-day trips | Med | In progress |
| Shopping list from meal plan | Meal plan without a shopping list is incomplete | Low | Dependency: Meal plan |
| Power budget / runtime estimate | Anyone with a portable power station needs this; EcoFlow has no trip-planning integration | Med | In progress |
| Offline access to trip data | Cell is unreliable at most campsites; app is useless if it fails offline | High | Phase 4 |
| Photo log attached to trips/spots | Memory capture is central to the second brain concept | Low-Med | Auto-tag in progress |

---

## Differentiators

Features that make this a "second brain" rather than another checklist app. Not universally expected, but high value for this use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Executive trip prep flow | Single unified view: weather + packing + meals + power + checklist. No camping app does this. Solves ADHD pre-trip paralysis. | Med | Phase 2; highest near-term value |
| Home prep vs. camp cooking distinction | Meal plans that know what you cook at home vs. what you cook at camp (vacuum seal, sous vide prep) are fundamentally different from backpacking food apps | Med | Must be explicit in meal plan UX |
| AI chat agent with full trip context | Ask "am I ready for Saturday?" and get a real answer that cross-references gear, weather, power, meals, and checklist | High | Phase 3; requires agent orchestration |
| NC camping knowledge base (RAG) | Local expert knowledge — dispersed spots, permit rules, road conditions, seasonal access — not available in any single app | High | Phase 3; most unique differentiator |
| Gear identification from photo | Point camera at unknown gear, get item identified and optionally added to inventory | Med | Claude vision API; Phase 3 |
| Voice trip debrief / ghostwriter | Speak for 2 minutes after a trip; get a structured log with key notes, conditions, and gear feedback. Zero-friction capture. | Med | Claude STT + summarize; Phase 3 |
| Safety float plan | "I'll be at XYZ grid ref, back by Sunday at 5pm" — generates a shareable emergency reference. Rare in consumer apps. | Low | Phase 3; safety feature |
| Power budget with weather adjustment | Solar input changes with cloud cover; EcoFlow's own app doesn't do trip-date solar forecasting | Med-High | Extends power budget; weather API dependency |
| Dog-aware trip planning | Filter campsites by pet rules, generate dog packing list, trail leash rules | Low-Med | Personal context; incoming soon |
| Signal map per spot | Which spots have cell service, which need Starlink. No app tracks this per-spot in a personal context. | Med | Phase 4; GPS + user-reported data |

---

## Anti-Features

Features to deliberately NOT build for a personal, single-user tool.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Social / sharing feeds | Social features demand ongoing moderation, content policies, and completely different UX mental model. Scope creep that dilutes focus. | Shareable trip reports (static export) are sufficient |
| Booking / reservation integration | Campsite APIs (Reserve America, Recreation.gov) have severe rate limits, terms-of-service friction, and break constantly. Not worth it for one user. | Link to booking site from spot detail; don't try to integrate |
| Calorie / macro tracking | This is a meal prep tool for enjoyable camping, not a fitness app. The distinction matters for UX — adding nutrition complexity makes meal planning feel like work. | Track meals per day and headcount only |
| Full recipe database | Maintaining recipe content is a product job, not a dev job. Any recipe library gets stale. | Support Claude-generated meal suggestions + user-defined custom meals |
| Turn-by-turn navigation | Gaia GPS, Maps.me, and OsmAnd solve offline navigation. Redundant to build. | Deep-link to preferred nav app with destination coordinates |
| Multi-user / auth / sharing | Adds significant complexity for zero personal benefit. | If buddy-trip reports ever needed, generate a read-only static export |
| Gear marketplace / deal tracking | Requires price API integrations that change constantly. High maintenance, low payoff for daily driver. | Wishlist with manual price notes is sufficient |
| Native mobile app (iOS/Android) | PWA on mobile handles this use case. App Store review cycles slow development. | Ship PWA with add-to-homescreen; revisit only if push notifications become critical |

---

## Feature Dependencies

```
Meal plan → Shopping list (shopping list requires meal plan to exist)
Meal plan → Executive prep flow (prep flow aggregates meal plan output)
Power budget → Executive prep flow (prep flow aggregates power budget output)
Weather integration → Power budget weather-adjustment (solar forecast needs weather data)
Weather integration → Executive prep flow (go/no-go signal)
Packing list → Executive prep flow (prep flow shows packing checklist status)
Gear inventory → AI packing list (Claude needs gear database to reason against)
Gear inventory → Gear identification (identified gear gets added to inventory)
Trip creation → All trip-scoped features (meals, power, packing, float plan all require trip)
Spots / map → NC knowledge base RAG (RAG answers should surface saved spots as results)
Photo upload → Photo auto-tag (tagging requires photos to exist in the system)
Claude API → All AI features (packing list, meal plan, chat agent, voice debrief, gear ID)
RAG knowledge base → AI chat agent (agent quality improves significantly with local knowledge)
Offline PWA → Download for offline (offline capability is the foundation; pre-trip download is UX polish on top)
```

---

## MVP Recommendation (next milestone scope)

**Prioritize (Phase 2 — complete the core loop):**
1. Meal planning with home-prep vs. camp-cooking distinction + auto shopping list — closes the biggest gap in trip prep
2. Power budget calculator (EcoFlow-aware, weather-adjusted) — unique to Will's setup, no existing tool does this well
3. Executive trip prep flow — unifies everything already built into a single pre-trip screen; highest perceived value per effort

**Defer to Phase 3:**
- AI chat agent — needs RAG and orchestration layer first; building it before the knowledge base produces a shallow experience
- RAG knowledge base — high value but high effort; define the corpus (NC-specific, personal notes, gear manuals) before building
- Voice debrief — good early Phase 3 pick; simple Claude STT + summarize, low infrastructure cost

**Defer to Phase 4:**
- Offline PWA — critical, but works best after feature set stabilizes; retrofitting offline to a stable app is easier than building offline-first while features are in flux
- Dog planning — personal context feature; straightforward to add once the dog actually arrives

---

## Meal Planning UX Specifics

Key patterns from research that apply to Outland OS:

- **Day-by-day structure with headcount** — plan breakfast/lunch/dinner per trip day, for N people. Coleman's meal planner got this right.
- **Home prep vs. camp cooking explicit split** — label meals as "prep at home" (vacuum seal, sous vide) or "cook at camp" (skillet, campfire). Will's vacuum sealer and sous vide make this a primary workflow, not an edge case.
- **Composite shopping list** — auto-generate one combined list across all meals, grouped by category (produce, protein, dry goods). Mealime's aisle-grouping pattern is the right UX.
- **Calorie-simple, not calorie-obsessive** — total calories per day as a sanity check, not macro tracking.
- **Claude as recipe brain, not recipe database** — prompt Claude with "3-day car camping trip, 2 adults, sous vide at home" and let it generate. Don't maintain a recipe library.

---

## Power Budget UX Specifics

Key patterns from research that apply to Outland OS:

- **Device registry with watt ratings** — users enter their devices (fridge, CPAP, phone charger, lights, etc.) with wattage. Renogy and Parked in Paradise calculators both confirm this as the right input model.
- **Hours-per-day per device** — how long each device runs daily is the key variable.
- **Output:** Daily Wh consumption, estimated battery days, required solar input.
- **EcoFlow-specific context** — Will has EcoFlow hardware. The EcoFlow app shows live usage but has no trip-planning mode. The budget calculator fills this gap pre-trip.
- **Weather-adjusted solar** — pull Open-Meteo cloud cover forecast for trip dates to estimate solar panel harvest. This is the differentiating feature no web calculator offers.
- **Red/yellow/green status** — don't show raw numbers alone; show "you're covered" or "bring the generator."

---

## Offline / PWA Specifics

What camping apps actually need offline (verified against real apps):

- **Cache-first for static assets** — app shell, JS, CSS, icons all precached at install. Standard with `next-pwa` or `workbox`.
- **Network-first with fallback for API data** — try to fetch fresh data, fall back to cached trip/gear/spot data. This is the correct strategy for trip data.
- **Explicit "Download for offline" action** — rather than automatic background caching of everything (which is large), give Will a button: "Download this trip for offline." Caches spot data, weather snapshot, packing list, meal plan, and map tiles for that trip.
- **Map tiles are the hard part** — Leaflet/OSM tile caching requires either a tile caching service or pre-download. This is the highest complexity item in offline support.
- **SQLite stays local** — current architecture is already offline-first for data; the missing piece is asset/API caching and map tiles.

---

## Sources

- [Backcountry Foodie — backpacking meal planner](https://backcountryfoodie.com/backpacking-meal-planner/)
- [Trail Recipes / Trail Chef App](https://www.trail.recipes/app/)
- [EcoFlow App features](https://www.ecoflow.com/us/app)
- [EcoFlow smart charging blog](https://www.ecoflow.com/us/blog/smart-charging-control-ecoflow-app)
- [Renogy solar calculator](https://www.renogy.com/pages/solar-power-calculator)
- [Parked in Paradise solar calculator](https://www.parkedinparadise.com/solar-calculator/)
- [Vamonos Vans solar calculator UX pattern](https://vamonosvans.com/solarcalculator)
- [Best offline navigation apps 2026 — Van Living 101](https://vanliving101.com/2026/03/07/the-best-offline-navigation-apps-for-camping-rv-travel-and-off-grid-adventures-2026-guide/)
- [PWA offline-first caching strategies — MagicBell](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Next.js native-like offline experience — Fishtank](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)
- [REI: Camping with ADHD](https://www.rei.com/blog/camp/camping-adhd)
- [AI camping apps overview — Rebecca Campbell](https://rebeccascampbell.com/ai-camping-apps)
- [Voice journaling AI features — AudioDiary/Deepgram](https://deepgram.com/ai-apps/audio-diary)
- [AudioPen — voice to structured text](https://www.audiopen.ai/)
- [CampChimp — AI for camping](https://campchimp.com/blog/ai-for-camping-benefits)
