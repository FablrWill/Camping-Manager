# Outland OS — Testing Checklist

> Things that should actually be verified before shipping. Add to this as features grow.
> No shame in not testing everything every session — but keep it honest: ✅ = actually verified, ⬜ = not tested yet.

---

## How to Use

- Run through relevant sections after major changes
- Check off what you actually tested
- Add new items when you build new features
- Leave ⬜ if you haven't tested it — don't lie to yourself

---

## Core Navigation

- [ ] Bottom nav tabs all load correct pages (Home, Spots, Gear, Trips, Vehicle)
- [ ] Dark mode toggle persists across page refreshes
- [ ] App installs as PWA from iPhone Safari (Add to Home Screen)
- [ ] Installed PWA icon and splash screen look correct
- [ ] Offline banner appears when network is lost

---

## Dashboard (Home)

- [ ] Gear count, total weight, spot count, photo count are accurate
- [ ] Recent gear list shows correct items
- [ ] Quick action buttons navigate correctly

---

## Gear Inventory (`/gear`)

- [ ] Gear list loads all items
- [ ] Category filter chips work (filter to correct items)
- [ ] Search filters by name in real time
- [ ] "Add Gear" form opens, fills, saves, and appears in list
- [ ] Edit gear item — changes persist after closing modal
- [ ] Delete gear item — item disappears from list
- [ ] Wishlist toggle (heart) moves item between owned / wishlist
- [ ] Wishlist tab shows only wishlisted items
- [ ] Condition badges show correct colors (Excellent → green, Poor → red, etc.)
- [ ] Weight displays correctly (grams/oz)

---

## Spots Map (`/spots`)

- [ ] Map loads with correct tiles (OpenStreetMap)
- [ ] Location markers appear at correct coordinates
- [ ] Photo markers appear at correct coordinates
- [ ] Clicking a marker opens popup with name, details
- [ ] Layer toggles (Photos / Spots / Path / Places) show/hide correctly
- [ ] Tapping "Add Spot" from map click opens slide-up form
- [ ] New spot saves and marker appears on map
- [ ] Edit spot from popup — changes persist
- [ ] Marker clustering works when zoomed out (overlapping pins group)
- [ ] Dark map tiles activate in dark mode

---

## Trips (`/trips`)

- [ ] Upcoming trips appear in correct section
- [ ] Past trips appear in correct section
- [ ] Countdown shows correct days until departure
- [ ] Active trip ribbon appears for in-progress trip
- [ ] "Create Trip" form opens and saves with name, dates, location, vehicle
- [ ] Trip prep page (`/trips/{id}/prep`) loads

### Trip Prep Page

- [ ] Trip header shows name, dates, location
- [ ] Weather card loads and shows forecast for trip location
- [ ] **Fuel & Last Stops card** — appears for trips WITH a location (coordinates set)
- [ ] **Fuel & Last Stops card** — absent for trips with NO location (silent omit)
- [ ] Fuel & Last Stops loading skeleton shows briefly before data
- [ ] Fuel & Last Stops shows ⛽ Fuel, 🛒 Grocery, 🏕️ Outdoor / Gear sections
- [ ] Each stop shows store name + distance in miles (e.g., "Ingles Markets — 12.4 mi")
- [ ] Empty category shows "None found nearby — plan ahead"
- [ ] Packing list section loads
- [ ] "Generate Packing List" creates items from Claude based on trip + gear
- [ ] Packing items can be checked off / unchecked
- [ ] Meal plan section loads and generates correctly
- [ ] Power budget section shows device calculations
- [ ] Departure checklist section appears

### Departure Flow (`/trips/{id}/depart`)

- [ ] Departure checklist items load and can be checked off
- [ ] "Leaving Now" button triggers trip caching (offline pack)
- [ ] Caching progress overlay shows download progress
- [ ] Float plan email sends correctly (Settings → Gmail)

---

## Chat (`/chat`)

- [ ] Chat input sends message and gets streaming response
- [ ] Tool activity indicator shows during tool calls
- [ ] Claude correctly uses trip context when a trip is active
- [ ] Knowledge base queries return NC camping info
- [ ] Spot recommendations load with weather context
- [ ] Chat context button shows current context (trip, gear count, etc.)
- [ ] Voice debrief button opens mic modal and transcribes

---

## Vehicle (`/vehicle`)

- [ ] Vehicle profile loads with specs
- [ ] Add mod — form saves and appears in mods list
- [ ] Edit mod — changes persist
- [ ] Delete mod — removed from list
- [ ] Cargo capacity displays correctly

---

## Photos

- [ ] Photo upload (drag-drop or tap) compresses and saves
- [ ] EXIF GPS coordinates auto-extracted and shown
- [ ] Photo appears on Spots map at correct location
- [ ] Photo linked to correct trip when uploaded during active trip

---

## Settings (`/settings`)

- [ ] Gmail settings save and persist
- [ ] Notification preferences save
- [ ] Data export works (if implemented)

---

## Offline / PWA

- [ ] App loads from home screen with no internet (PWA cache)
- [ ] Offline banner appears correctly when network drops
- [ ] "Leaving Now" caches trip data — spots map tiles load offline
- [ ] Cached trip prep page loads offline
- [ ] Offline write queue works — actions taken offline sync when back online

---

## AI Features

- [ ] Packing list generation returns relevant items for trip destination + weather
- [ ] Meal plan generation creates plausible meals for trip duration
- [ ] Power budget calculates correctly for entered devices
- [ ] Chat agent correctly answers "what gear do I have for cold weather?"
- [ ] Chat agent correctly answers "what's the nearest camping spot to Asheville?"
- [ ] Post-trip debrief voice note transcribes and saves correctly

---

## Fuel & Last Stops (Phase 18 — specific cases)

- [ ] Trip with Linville Gorge location → shows nearby fuel stations in NC mountains
- [ ] Trip with Davidson River location → shows nearby Brevard-area grocery stores
- [ ] Trip with no location set → card entirely absent (no empty card, no error)
- [ ] Loading state visible briefly on fast connection (may need throttling in DevTools)
- [ ] Error state: disconnect network mid-load → red error card appears
- [ ] Results limited to max 2 per category (no more than 2 items per section)
- [ ] Distances are in miles, 1 decimal place (e.g., "8.3 mi", not "8.3456 mi")
- [ ] Card appears AFTER weather, BEFORE packing list — scroll order correct

---

## iPhone-Specific (since that's the primary device)

- [ ] All tap targets large enough (no tiny buttons)
- [ ] Bottom nav not obscured by iPhone home bar
- [ ] Modals scroll correctly without getting stuck
- [ ] Map pinch-to-zoom works
- [ ] Photo upload from camera roll works
- [ ] Voice input works through microphone permission prompt
- [ ] Text is readable in both light and dark mode outdoors (sunlight legibility)
- [ ] PWA runs full-screen (no Safari URL bar)

---

## Regression Smoke Test (after any major change)

Quick set — run these first before the full list above.

- [ ] App loads on iPhone
- [ ] Can navigate to all 5 main tabs
- [ ] Gear page loads gear items
- [ ] Trips page loads trips
- [ ] Chat sends a message and gets a response
- [ ] Spots map loads and shows pins
- [ ] No console errors on any page (check Safari Web Inspector)

---

*Last updated: 2026-04-03 (Phase 18 — Fuel & Last Stops)*
