# Outland OS — UX Execution Plan

**Date:** 2026-04-03
**Source:** Synthesized from `UI-UX-REVIEW-2026-04-03.md`, `STYLE-GUIDE.md`, `USER-JOURNEY.md`, and `AUDIT.md`.
**Purpose:** Prioritized, incremental UX improvement plan. Mobile-first and dark-mode consistency are hard constraints throughout.

---

## 1) Top 10 UI/UX Changes (Priority Order)

### 1. Fix hardcoded trip count on the dashboard
**Problem:** Home dashboard shows `0` trips regardless of actual data — erodes trust immediately.
**Change:** Wire to live server query. Add empty vs. has-data dashboard variants.
**Impact:** Credibility restored; dashboard feels like a real product.
**Effort:** S

---

### 2. Reduce bottom nav to 5 tabs + "More" sheet
**Problem:** 6 tabs (including Chat and Inbox) exceed the style guide's own 5-tab limit and push high-value items (Vehicle) into obscurity while surfacing low-frequency ones.
**Change:** Primary tabs → `Home / Trips / Gear / Spots / More`. More sheet → Chat, Inbox (badged), Vehicle, Settings.
**Impact:** Reduces decision cost on every screen; every action lands within thumb reach.
**Effort:** S

---

### 3. Add Trip Prep stepper to Home and Trip detail
**Problem:** The 5-step core journey (Destination → Weather → Packing → Meals → Departure) exists in the user journey doc but has no visual representation in the UI. Users see a toolbox, not an assistant.
**Change:** `TripPrepStepper` component with step indicators and completion state. Surface on Home dashboard and `/trips/[id]/prep`.
**Impact:** The app's core value becomes immediately legible. This is the single biggest UX unlock.
**Effort:** M

---

### 4. Standardize filter chips and segment controls to design tokens
**Problem:** Gear category filters use ad-hoc blue/gray classes instead of the amber chip system defined in the style guide. Design language drifts with each sprint.
**Change:** Introduce `FilterChip` and `SegmentedControl` in `components/ui`. Migrate gear, trips, and spots filter bars.
**Impact:** Visual cohesion across all list screens; lower maintenance cost going forward.
**Effort:** M

---

### 5. Simplify header — move theme toggle out
**Problem:** Header exposes both Settings and Theme toggle, competing with the page title and adding visual noise to every screen.
**Change:** One utility icon in header (settings/menu). Theme toggle moves into Settings page.
**Impact:** Cleaner top bar; page titles breathe.
**Effort:** S

---

### 6. Replace all `alert()` / `confirm()` calls with inline error states
**Problem:** `VehicleClient` and `TripsClient` use `alert()` for errors and `LocationForm` uses `confirm()` for deletes — both block the thread and look broken on mobile.
**Change:** State-based inline error messages (pattern already exists in `GearClient`). Use existing `ConfirmDialog` from `Modal.tsx` for deletes.
**Impact:** Mobile UX no longer interrupted by native dialogs.
**Effort:** S

---

### 7. Fix dark mode gaps on `/spots`
**Problem:** Layer toggle buttons and `LocationForm` container missing dark mode variants — breaks night-mode consistency at exactly the time it matters most (campsite use after dark).
**Change:** Add `dark:` variants to layer toggle buttons and `LocationForm` wrapper per style guide tokens.
**Impact:** Full dark mode parity on maps page.
**Effort:** S

---

### 8. Add empty states + loading skeletons for all top-level modules
**Problem:** Missing skeleton/empty variants make the app look unfinished on first launch or slow connection — especially damaging for a tool used in low-signal environments.
**Change:** Skeleton pulse rows for list screens (Gear, Trips, Spots). Empty state pattern per style guide (`text-center py-16` + emoji + CTA) for each module.
**Impact:** App feels intentional at every data state; trust holds on slow camp WiFi.
**Effort:** M

---

### 9. Add Radix UI as headless accessibility layer for modals and dropdowns
**Problem:** Custom modal/dropdown implementations accumulate subtle focus-trap, keyboard-nav, and ARIA regressions. `AUDIT.md` already flagged missing aria-labels on multiple components.
**Change:** Install `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`. Wrap existing modal/dropdown surfaces. No visual change — Radix is unstyled.
**Impact:** Keyboard nav, focus management, and screen reader support handled by default. Reduces a11y regressions as UI grows.
**Effort:** M

---

### 10. Adopt React Hook Form + ZodResolver for Trips, Gear, and Settings forms
**Problem:** Forms use ad-hoc state + manual validation. Zod already validates server-side — client and server are disconnected.
**Change:** Install `react-hook-form` + `@hookform/resolvers`. Share Zod schemas between API routes and form components. Start with `TripForm` and `GearForm`.
**Impact:** Consistent validation errors, less boilerplate, no silent submit failures on mobile.
**Effort:** M

---

## 2) 2-Week Sprint Plan

### Week 1 — Quick wins + navigation foundation

| Day | Target | Files |
|-----|--------|-------|
| 1 | Fix trip count query on dashboard | `app/page.tsx`, `components/DashboardClient.tsx` |
| 1 | Replace `alert()` in VehicleClient + TripsClient | `components/VehicleClient.tsx`, `components/TripsClient.tsx` |
| 2 | Replace `confirm()` in LocationForm with ConfirmDialog | `components/LocationForm.tsx` |
| 2 | Simplify header — remove theme toggle, keep one icon | header component or layout |
| 3 | Fix dark mode gaps on `/spots` layer toggles + LocationForm | `app/spots/spots-client.tsx`, `components/LocationForm.tsx` |
| 3–4 | Restructure bottom nav: 5 tabs + More sheet | `components/BottomNav.tsx`, new `components/MoreSheet.tsx` |
| 5 | Add `FilterChip` + `SegmentedControl` to `components/ui` | `components/ui/FilterChip.tsx`, `components/ui/SegmentedControl.tsx` |
| 5 | Migrate gear category filter bar to new `FilterChip` | `components/GearClient.tsx` |

### Week 2 — Core journey + component polish

| Day | Target | Files |
|-----|--------|-------|
| 6–7 | Build `TripPrepStepper` component | `components/TripPrepStepper.tsx` |
| 7 | Wire stepper to Home dashboard (shows active trip progress) | `components/DashboardClient.tsx` |
| 8 | Wire stepper to `/trips/[id]/prep` page | `app/trips/[id]/prep/page.tsx` |
| 9 | Add empty states for Gear, Trips, Spots modules | `components/GearClient.tsx`, `components/TripsClient.tsx`, `app/spots/spots-client.tsx` |
| 9 | Add skeleton loaders for all list screens | same files + `components/ui/Skeleton.tsx` |
| 10 | Install Radix dialog, wrap existing Modal | `components/ui/Modal.tsx`, `components/ui/Dialog.tsx` |
| 10 | Add `aria-label` to all icon-only buttons flagged in AUDIT | `components/GearClient.tsx`, `components/LocationForm.tsx`, `components/TripsClient.tsx` |

> **Note:** React Hook Form migration starts Week 3. It's correctness work — don't block the sprint on it.

---

## 3) Information Architecture Updates

### Final Nav Model

```
Bottom Tab Bar (always visible):
  🏠 Home     🏕️ Trips     🎒 Gear     📍 Spots     ··· More

More Sheet (slide-up):
  💬 Chat
  📬 Inbox  (unread badge)
  🚙 Vehicle
  ⚙️  Settings
  📖 Docs / Help
```

### What Moves and Why

| Item | From | To | Why |
|------|------|----|-----|
| Chat | Bottom tab | More sheet | Low-frequency destination; shouldn't compete with Trips and Gear for prime nav real estate |
| Inbox | Bottom tab | More sheet (badged) | Notification surface, not a primary workflow entry point |
| Vehicle | Hidden / secondary | More sheet | Low-frequency but important; badge is enough affordance |
| Theme toggle | Header | Settings page | Not a per-session action; header space is valuable |
| Settings | Header icon | More sheet + header shortcut | More is the canonical home |

**Net result:** Every thumb-range tab maps to a daily-use workflow. The app's shape matches the user journey.

---

## 4) Tech Stack Recommendations

### Keep
- **Next.js 16 (App Router)** — routing, SSR, and API routes all working well
- **Tailwind CSS 4** — design system is already Tailwind-native
- **Prisma + SQLite** — right for single-user local-first; migrate to Postgres when deploying to Vercel
- **Leaflet + OpenStreetMap** — free, no key, works offline with `leaflet.offline`
- **Lucide React** — consistent icon system

### Add (incremental, low risk)

| Package | Purpose | When |
|---------|---------|------|
| `@radix-ui/react-dialog` + `@radix-ui/react-dropdown-menu` | Headless a11y layer for modals and menus | Week 2 |
| `react-hook-form` + `@hookform/resolvers/zod` | Unified client/server form validation | Week 3 |
| `@tanstack/react-query` | Cache + revalidate for Inbox badge, weather snippets, live trip state | After core flow is stable |
| Playwright snapshot tests | Visual regression guard as UI grows | After nav refactor lands |

### Migration Strategy

1. **Radix:** Wrap existing modal component — zero visual change, pure behavior upgrade. One file.
2. **React Hook Form:** Start with `GearForm` (smallest). Copy schema to `lib/schemas/gear.ts`. Migrate `TripForm` next once pattern is proven.
3. **TanStack Query:** Add to Inbox badge fetch first (isolated). Expand to weather and trip prep state once established.
4. **SQLite → Postgres:** Only when moving to Vercel. Prisma makes this a config change + one migration run. No app code changes needed.

### Avoid
- Redux, Zustand, or any global state manager — React state + TanStack Query covers all needs
- CSS-in-JS — Tailwind is already established; mixing would fragment the system
- Google Maps API — OpenStreetMap + Leaflet is free and sufficient

---

## 5) Success Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Time-to-first-trip-created** | Minutes from first app open to a trip saved | < 3 min |
| **Trip prep completion rate** | % of trips where all 5 prep steps reach "done" | > 60% within 4 weeks of stepper launch |
| **Prep funnel drop-off step** | Which stepper step has the highest abandonment | Identify top drop-off; fix that step next |
| **Dashboard CTA click-through** | Which quick-action buttons are actually tapped | Cut anything < 5% click rate |
| **7-day return rate** | Users who open the app again within 7 days of creating a trip | > 70% |
| **Dark mode usage** | % of sessions in dark mode | Baseline only — informs campsite usage patterns |

### How to Measure Without Full Analytics Infra

- **Server logs** — count `/api/trips` POST (trips created) vs. `/api/trips/[id]/prep` GET (prep opened)
- **Packing list generations** — count Claude API calls per trip
- **Checklist completion** — count `PackingItem` checked state changes per trip

---

## Assumptions and Unknowns

- **Bottom nav component location** — assuming it's in `components/` or embedded in a layout; adjust file targets after reading.
- **Trip count query** — need to confirm whether `app/page.tsx` is skipping the trips count or returning a static value.
- **TanStack Query** — if existing `useEffect`-based fetching is already causing bugs, move this earlier than Week 3.
- **Playwright** — requires a running dev server in CI; only add once a CI pipeline exists to run it.
- **React Hook Form** — listed as Week 3 start; if `GearForm` is actively buggy, pull it into Week 1.
