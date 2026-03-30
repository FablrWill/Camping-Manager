# Outland OS — Full Project Audit

> **Date:** 2026-03-30 (Session 9 — Overnight Audit)
> **Purpose:** Top-to-bottom review of code quality, architecture, docs, and roadmap. Includes research on integrations, open source tools, hardware access, and creative ideas.

---

## Part 1: Code Health

The codebase is clean and well-organized. No critical bugs. Here's what needs tightening:

### Must Fix (before building new features)

1. **Vehicle + Trips API routes have no error handling.** Gear and Locations APIs have proper try-catch + validation. Vehicle and Trips routes have zero. One bad request crashes the server.
   - `app/api/vehicle/route.ts` — no try-catch on GET or POST
   - `app/api/vehicle/[id]/route.ts` — no try-catch on GET or PUT
   - `app/api/vehicle/[id]/mods/route.ts` — no try-catch on POST
   - `app/api/trips/route.ts` — no try-catch on GET or POST
   - `app/api/timeline/route.ts` — Promise.all with no wrapper
   - **Fix:** Copy the pattern from `app/api/gear/route.ts` — it's the gold standard.

2. **Mixed error feedback in components.** GearClient uses state-based error display (good). VehicleClient and TripsClient use `alert()` (bad on mobile — blocks the thread, ugly).
   - **Fix:** Replace all `alert()` calls with error state + inline message, same pattern as GearClient.

3. **CHANGELOG.md has duplicate entries.** Sessions 6 and 7 each appear twice. Sessions are out of chronological order (goes 8, 7, 6, 1, 2, 3, 4, 7, 6, 5, 6). Hard to scan.
   - **Fix:** Deduplicate and reorder chronologically (1 → 8).

### Should Fix (quality polish)

4. **Dark mode gaps on /spots page.** Layer toggle buttons (`bg-stone-800 text-white`) don't have dark mode variants. LocationForm container missing dark background.

5. **Missing aria-labels.** Close button in LocationForm, gear item buttons in GearClient, and the "Plan Trip" toggle in TripsClient all lack accessibility labels.

6. **Two inline styles that should be Tailwind.** `spots-client.tsx` line 209 (`style={{ height: "calc(100vh - 64px)" }}`) and SpotMap line ~598 (`style={{ minHeight: "400px" }}`).

7. **LocationForm uses browser `confirm()` for delete** instead of the ConfirmDialog component that already exists in Modal.tsx.

### Already Good

- **Zero unused imports or dead code.** Clean.
- **Only one `any` type** in the whole codebase (Leaflet workaround in SpotMap — justified).
- **Database queries are efficient.** `Promise.all()` for parallel fetches, proper `include`/`select`, batch imports with configurable chunk size. No N+1 issues.
- **Mobile design is solid.** 44px+ touch targets, safe area padding, bottom nav, responsive grids.
- **Design system is consistent.** CSS custom properties, reusable UI components, dark mode from day one.
- **File organization is excellent.** Clear separation of concerns, barrel exports, no orphaned files.

---

## Part 2: Documentation Health

**95% aligned.** Almost no contradictions across 15+ doc files.

### Issues Found

1. **CHANGELOG.md ordering** — duplicate sessions, non-chronological (see above)
2. **PLAN.md** is the original Session 1 kickoff doc — still useful as history but could confuse someone who reads it as current. Consider adding a one-line note: *"Historical — see FEATURE-PHASES.md for current roadmap."*
3. **SESSION-1-SUMMARY.md and SESSION-2-SUMMARY.md** are superseded by CHANGELOG.md. Not harmful, just redundant.

### Already Good

- All docs say "Outland OS" — no "Camp Commander" leftovers in active docs
- TASKS.md, FEATURE-PHASES.md, and USER-JOURNEY.md all agree on priorities
- CLAUDE.md project structure matches reality
- Cross-references are explicit ("See docs/USER-JOURNEY.md")
- STATUS.md is a solid pickup doc for resuming after a break

---

## Part 3: What We Can Leverage (Open Source + APIs)

Research on what already exists so we don't build from scratch.

### Drop-in Today (free, no API key)

| Tool | What It Does | npm Package |
|------|-------------|-------------|
| **Open-Meteo** | Weather forecasts + historical data. Wind, UV, precip, soil temp, solar radiation. No API key. | `openmeteo` |
| **@tmcw/togeojson** | Parse GPX + KML files into GeoJSON (Leaflet-ready) | `@tmcw/togeojson` |
| **leaflet.offline** | Cache map tiles to IndexedDB for offline use | `leaflet.offline` |
| **Serwist** | PWA service worker for Next.js (successor to next-pwa, which is dead) | `@serwist/next` |

### Free with API Key Signup

| Tool | What It Does | Free Tier |
|------|-------------|-----------|
| **RIDB (Recreation.gov)** | 4,500+ federal campgrounds with amenities, fees, availability | 50 req/min |
| **NPS API** | National Park campgrounds, trails, visitor centers, photos | Unlimited |
| **NREL PVWatts v8** | Solar energy estimation by location — feeds power budget calculator | 1,000 req/hr |
| **Spoonacular** | Recipe search + meal plan generation + grocery lists | 150 req/day |

### Google Integrations Worth Doing

| Service | Value | Why |
|---------|-------|-----|
| **Google Calendar** | **High** | Trip events, prep-day reminders, date blocking. Free, mature API, low complexity. |
| **Routes API** | **High** | Drive times + "Search Along Route" for last gas/grocery stop. Killer camping feature. |
| **Places API (New)** | **Medium** | Search campgrounds, stores, gas stations near a location. |
| **Google Drive** | **Low** | Permit/reservation storage. Local storage probably fine for now. |

### Google Integrations NOT Worth Doing

| Service | Why Not |
|---------|---------|
| **Google Photos API** | Gutted in March 2025. Can't search user's library anymore. Takeout import is better. |
| **Google Keep** | No API for personal accounts (enterprise only). Build checklists natively. |
| **Saved/Starred Places** | No API exists. Only Takeout export. |
| **Location History (continuous)** | Google moved to on-device only. Takeout still works but is declining. |

### Integration Architecture

For Google services: `next-auth` (OAuth flow) + `googleapis` (API client). Authenticate once, tokens refresh automatically. One npm dependency covers all Google APIs.

---

## Part 4: PWA vs. Native — Hardware Access

**Bottom line: PWA works for 90% of what Outland OS needs.** Here's the breakdown.

### What Works in a PWA on iOS

| Capability | How | Caveats |
|-----------|-----|---------|
| **Camera (photo capture)** | `<input type="file" capture>` | Reliable. Opens camera or photo picker. |
| **GPS (foreground)** | `navigator.geolocation` | Works in standalone PWA mode. |
| **Microphone (recording)** | `MediaRecorder` API | Records audio. Send to Whisper/Claude for transcription. |
| **Offline data** | IndexedDB + Cache API | Up to ~500MB if installed to home screen. |
| **Push notifications** | Web Push (iOS 16.4+) | Works but unreliable. Don't depend on it. |
| **Map tiles offline** | leaflet.offline → IndexedDB | Cache tiles for saved areas. |

### What Does NOT Work in a PWA on iOS

| Capability | Why | Impact on Outland OS |
|-----------|-----|---------------------|
| **Bluetooth** | Apple blocks Web Bluetooth entirely | Can't monitor EcoFlow battery |
| **Background GPS** | PWA freezes when not in foreground | Can't track route with screen off |
| **Background sync** | Not supported on iOS | All syncing must happen when app is open |
| **Web Speech API** | Broken in standalone mode | Voice journaling needs server-side transcription (Whisper) |
| **Save to camera roll** | No direct file system access | User must manually save via share sheet |
| **NFC** | Apple blocks Web NFC | Not relevant for current features |

### Key iOS PWA Gotchas

- **Install flow is manual.** No install prompt on iOS. User must go Share → Add to Home Screen. Need an in-app banner with instructions.
- **Storage eviction.** Safari deletes ALL web storage after 7 days of no visits — BUT installed PWAs are exempt. Must be installed to home screen.
- **Camera via getUserMedia is buggy** in standalone mode. Stick with `<input type="file" capture>` instead.

### If We Ever Go Native

**Path:** Expo + React Native. React business logic (hooks, API calls, data models) transfers. UI components need rewriting (~60-70% of frontend). Prisma doesn't run on mobile — switch to expo-sqlite or WatermelonDB.

**Middle path:** Capacitor wraps the existing Next.js app in a native shell, giving access to Bluetooth, background GPS, camera via plugins. Less rewriting than React Native but less native feel.

### Recommendation

**Start as PWA. Go native only if you need Bluetooth (EcoFlow) or background GPS.** The core camping manager features — gear lists, trip planning, maps, photos, weather, packing lists, meal planning — all work in a PWA. Voice journaling works via MediaRecorder + server-side Whisper. Camera works via file input. GPS works in foreground.

---

## Part 5: Creative Ideas

Five features that go beyond the standard camping app playbook.

### 1. "Last Mile" Smart Routing

When you tap "Navigate to campsite," the app doesn't just give you Google Maps directions. It knows the last 10 miles are forest roads, so it:
- Flags that your Santa Fe has 8.2" clearance (sufficient for the road condition you rated last time)
- Shows the last gas station, last grocery store, and last cell signal point along the route
- Calculates "point of no return" — after this stop, you're committed
- Optionally sends a "headed out" text to your emergency contact with ETA

**Uses:** Google Routes API (Search Along Route), your existing Location data (road conditions, signal quality), vehicle specs.

### 2. Campsite "Replay" — Relive Your Trip in 30 Seconds

After a trip, the app generates a mini time-lapse of your trip:
- GPS path animates on the map (you already built this!)
- Photos pop up at their locations as the path passes them
- Place visits pulse with timestamps
- Weather overlay shows what conditions were like each day
- Claude generates a one-paragraph trip summary narrated over it

This turns your existing timeline + photo data into something you'd actually want to share. Could export as a short video or animated HTML.

**Uses:** Your existing path animation, photo markers, timeline data. Add: Open-Meteo historical weather, Claude API for narrative.

### 3. "What's Different This Time" — Trip Comparison

When you return to a campsite you've visited before, the app shows:
- What you packed last time (and what you forgot / didn't use)
- What the weather was vs. what it'll be this time
- What's changed at the site (road conditions, signal, water)
- A Claude-generated diff: "Last time you went in October with 40°F nights. This time it's July — swap the 20° bag for the 40° and add bug spray."

This is the "learn from experience" feature that no camping app does well. Your data model already supports it — trips link to packing items, locations have ratings, weather is time-stamped.

**Uses:** Existing Trip + PackingItem + Location models. Add: Open-Meteo historical weather, Claude API for comparison narrative.

### 4. "Camp Kitchen" — Meal Prep as a Workflow, Not a List

Most meal planners give you a list of recipes. This gives you a *workflow*:
- **Wednesday night (home kitchen):** Vacuum-seal these 4 proteins. Prep these marinades. Pre-chop these vegetables. (You own a vacuum sealer + sous vide — the app knows this.)
- **Thursday morning (grocery run):** Buy this list, organized by store section. Check off as you go.
- **Friday at camp:** Tonight's dinner takes 20 min with a camp stove. Here's the order of operations.
- **Saturday morning:** Coffee first (water is already filtered from last night). Then this breakfast.

Claude generates all of this from: trip duration, number of people, dietary preferences, equipment list (camp stove, cooler size, vacuum sealer), and weather (cold nights = hot meals, hot days = no-cook lunches).

**Uses:** Claude API, your gear inventory (cooking equipment), trip dates, Open-Meteo weather.

### 5. "Departure Checklist" — The Physical Act of Leaving

The hardest part of a camping trip isn't planning — it's the 2 hours before you leave. The app becomes a step-by-step departure assistant:
- **The night before:** Charge these devices (power bank, headlamp, phone). Freeze these water bottles. Set these things by the door.
- **Morning of:** Load in this order (heavy items first, tent accessible, cooler last). Here's a cargo diagram for your Santa Fe's specific dimensions.
- **Final sweep:** Walk through each room — kitchen (cooler, stove fuel, spices), bedroom (sleeping bags, pillows), garage (chairs, tarp, firewood). Check off each zone.
- **On the road:** ETA to campsite, last stop reminder, weather alert if conditions changed overnight.

This is the "executive function support" feature — particularly valuable for someone with ADHD. It externalizes the mental load of departure.

**Uses:** Claude API, your gear inventory + packing list, vehicle cargo dimensions, Google Routes API.

---

## Part 6: Implementation Plan for Planned Features

Here's how each "Up Next" feature actually gets built, in order.

### 1. Weather Integration

**API:** Open-Meteo (free, no key needed, better data than OpenWeatherMap for camping)

**What to build:**
- `lib/weather.ts` — fetch forecast by lat/lng + date range. Return: daily high/low, wind, precip %, UV, sunrise/sunset.
- `components/WeatherCard.tsx` — compact card showing trip weather. Icons for conditions. Alerts for extreme weather.
- Wire into trip detail view: when a trip has a location + dates, auto-fetch weather.
- Store forecast snapshot with the trip so it's available offline.

**Complexity:** Small. 1 API call, 1 component, 1 utility function. No API key needed.

### 2. Claude API + Packing List Generator

**Prereq:** Claude API key (Will needs to generate this)

**What to build:**
- `lib/claude.ts` — Claude API client wrapper. System prompt with camping context.
- `app/api/ai/packing-list/route.ts` — POST endpoint. Takes: trip details, weather forecast, gear inventory, vehicle. Returns: recommended packing list with reasoning.
- `components/PackingList.tsx` — Interactive checklist. Items link to gear inventory. "Why?" expandable for each item. Add/remove items.
- `app/api/trips/[id]/packing/route.ts` — CRUD for trip-specific packing items (PackingItem model already exists).

**Complexity:** Medium. The Claude prompt engineering matters most. The UI is a checklist with some intelligence.

### 3. Meal Planning + Shopping List

**What to build:**
- `app/api/ai/meal-plan/route.ts` — POST endpoint. Takes: trip duration, number of people, dietary needs, cooking equipment (from gear), weather. Returns: meal plan + shopping list + prep instructions.
- `components/MealPlan.tsx` — Day-by-day meal view. Expandable recipes. Prep-at-home vs. cook-at-camp split.
- `components/ShoppingList.tsx` — Grouped by store section (produce, meat, dry goods, ice). Checkable.
- Consider Spoonacular API for recipe data, or let Claude generate everything.

**Complexity:** Medium. Claude does the heavy lifting. UI is structured display.

### 4. Power Budget Calculator

**What to build:**
- `components/PowerBudget.tsx` — Input: battery capacity (Wh), solar panel wattage, devices + usage hours. Output: daily consumption, solar generation estimate, days of autonomy.
- `lib/solar.ts` — Use NREL PVWatts API for location-specific solar estimates. Adjust for weather (cloud cover from Open-Meteo).
- Hardcode EcoFlow specs (no API available — manually enter battery and panel specs as gear items).

**Complexity:** Small-medium. Math is straightforward. NREL API is free with key signup.

### 5. Trip Prep Flow

**What to build:**
- `app/trips/[id]/prep/page.tsx` — Single "prepare this trip" view that stitches together:
  1. Weather card (auto-fetched)
  2. Packing list (AI-generated, editable)
  3. Meal plan + shopping list (AI-generated)
  4. Power budget (calculated)
  5. Departure checklist (AI-generated based on packing list)
- This is the "Wednesday before Saturday" experience from USER-JOURNEY.md.

**Complexity:** Medium-large. Mostly composition of the above features. The value is in the flow, not new tech.

---

## Part 7: Open Questions (Radar Items)

These don't need answers now. Just things to think about.

1. **Claude API key** — Still the #1 blocker for packing list, meal planning, and all AI features. Need to generate one from Anthropic console.

2. **PWA install experience** — How do we get Will (and eventually others) to actually install to home screen? Need an in-app banner with iOS-specific instructions. First-run experience matters.

3. **Data portability** — SQLite is great for local dev but needs to become Postgres for Vercel. When do we make that switch? Before or after MVP features are built?

4. **Google OAuth setup** — If we add Calendar + Routes integration, we need OAuth. When is the right time to add this complexity? Probably after core AI features work.

5. **Offline-first architecture** — If the app is used at campsites with no signal, offline matters. When do we add Serwist + IndexedDB sync? Probably Phase 4, but the data model choices we make now should support it.

6. **Native app timeline** — PWA covers 90% of needs. If Bluetooth (EcoFlow monitoring) or background GPS (route tracking) become must-haves, we'd need to go Expo/React Native or Capacitor. Not urgent but worth keeping in mind for architecture decisions.

7. **Multi-user future** — Will says single-user for now, but "send a float plan to my emergency contact" and "share a trip plan with camping buddies" both imply other people eventually. Don't build auth yet, but don't make choices that make it impossible later.

8. **Campground database** — RIDB (Recreation.gov) has 4,500+ federal campgrounds for free. NPS API has National Park data. Worth importing as a reference dataset for trip planning. When?

9. **Voice journaling** — Web Speech API is broken in standalone PWA mode on iOS. The path is: MediaRecorder → upload audio → Whisper/Claude server-side transcription. Works, but needs a backend endpoint.

10. **Continuous location tracking** — Google Timeline is declining (on-device only now). If we want ongoing location data, consider OwnTracks (self-hosted) or just rely on per-trip manual GPS captures. Background tracking requires native app.

---

## Summary

**The foundation is solid.** 10 database models, full CRUD APIs, 5 pages with dark mode, a design system, and thorough documentation. The pieces fit together well.

**Three things to do before building more features:**
1. Fix error handling on Vehicle + Trips API routes (30 min)
2. Clean up CHANGELOG.md duplicates (15 min)
3. Get a Claude API key (5 min, biggest unblock)

**Then build in this order:**
1. Weather (Open-Meteo, no key needed, small)
2. Packing list (Claude API, the core value)
3. Meal planning (Claude API, builds on packing list)
4. Power budget (NREL API, standalone calculator)
5. Trip prep flow (composes everything above)

**Leverage, don't rebuild:** Open-Meteo for weather, RIDB/NPS for campgrounds, @tmcw/togeojson for GPX, leaflet.offline for offline maps, Serwist for PWA, Google Calendar + Routes API for integrations.

**Stay PWA for now.** Camera, GPS, mic, offline storage all work. Go native only if EcoFlow Bluetooth or background GPS become must-haves.
