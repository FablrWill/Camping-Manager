# UX Audit — Outland OS

**Date:** 2026-04-01
**Auditor:** Claude (UX Engineer review)
**Target user:** Will Sink, single user, primarily on phone (iPhone)
**App type:** Mobile-first Next.js web app for car camping management

---

## Executive Summary

Outland OS is well-built for a personal tool. The mobile-first layout, bottom nav, and dark mode are solid foundations. The main friction points are: **no way to edit or delete trips from the UI**, **LocationForm ignores dark mode entirely**, **the Spots page has no Vehicle link in the nav**, and **several forms use `confirm()` instead of inline dialogs**. The design system exists but is underused -- most components inline their own styles instead of using the UI primitives.

---

## 1. CRUD Gap Matrix

| Entity | Create | Read | Update | Delete | Notes |
|--------|--------|------|--------|--------|-------|
| **Gear** | Yes | Yes (list + detail in modal) | Yes (edit modal) | Yes (confirm dialog) | Full CRUD. Well done. |
| **Trip** | Yes (inline form) | Yes (list + card expand) | **NO** | **NO** | BLOCKER: No edit or delete for trips. API has PUT/DELETE but no UI path. |
| **Location** | Yes (map click) | Yes (map popup) | Yes (via popup Edit btn) | Yes (in form) | Delete uses `confirm()` -- should use inline dialog. |
| **Vehicle** | No (seed only) | Yes | **NO** | No (single vehicle) | No UI to edit vehicle specs. Only way is direct DB. |
| **Vehicle Mod** | Yes | Yes (list) | **NO** | **NO** | Can add mods but never edit or remove them. |
| **Photo** | Yes (upload) | Yes (map markers) | **NO** | **NO** | No way to delete photos or edit titles/metadata. |

---

## 2. Findings by Severity

### BLOCKER

#### B1. Trips cannot be edited or deleted
- **What the user sees:** A trip card with a name, dates, and location. No edit button, no delete option, no way to fix a typo or wrong date.
- **Impact:** If Will creates a trip with the wrong dates, his only option is to edit the database directly.
- **Where:** `TripsClient.tsx` -- no edit form exists, no delete flow wired up.
- **Recommendation:** Add a trip edit modal (reuse the creation form pattern from GearForm). Add a delete confirmation dialog. The API routes (`PUT /api/trips/[id]`, `DELETE /api/trips/[id]`) already exist.

#### B2. LocationForm has no dark mode support
- **What the user sees:** When in dark mode, the LocationForm appears as a white panel with light-colored inputs, white backgrounds, and light text labels. Every single element is hardcoded to light mode classes.
- **Impact:** Unreadable in dark mode. Every input, select, label, and button ignores `dark:` variants.
- **Where:** `LocationForm.tsx` -- all ~25 form elements use only light mode classes (e.g., `bg-white`, `text-stone-700`, `border-stone-300` without any `dark:` counterparts).
- **Recommendation:** Add `dark:` variants to every element, matching the pattern used in `GearForm.tsx`.

---

### MAJOR

#### M1. Dashboard "Trips" stat card is hardcoded to "0"
- **What the user sees:** The Trips stat card always shows "0" and "plan your next trip" regardless of how many trips exist.
- **Where:** `DashboardClient.tsx` line 163 -- literal `0` instead of a dynamic count.
- **Recommendation:** Pass `tripCount` through the `stats` prop and display it.

#### M2. No way to edit vehicle specs
- **What the user sees:** The vehicle page shows specs (fuel economy, ground clearance, towing capacity, cargo dimensions) but there is no edit button.
- **Impact:** If specs change (e.g., after adding a roof rack that changes cargo volume), Will must edit the database.
- **Where:** `VehicleClient.tsx` -- read-only display, no edit form.
- **Recommendation:** Add an edit mode or edit modal for vehicle specs.

#### M3. Vehicle mods cannot be edited or deleted
- **What the user sees:** A mod card with name, description, cost, and date. No edit button, no delete option.
- **Where:** `VehicleClient.tsx` -- mod cards are display-only divs with no interactive elements.
- **Recommendation:** Add click-to-edit and delete with confirmation (same pattern as gear items).

#### M4. Photos cannot be deleted or have metadata edited
- **What the user sees:** Photos appear on the map as markers with popups. No delete button, no way to edit title or correct GPS coordinates.
- **Where:** `SpotsClient.tsx` / `SpotMap.tsx` -- photo markers have view-only popups.
- **Recommendation:** Add a delete button to photo popups. Allow editing title and manually setting coordinates for unplaced photos.

#### M5. `confirm()` used for location deletion
- **What the user sees:** A native browser dialog that says "Delete this location?" -- not styled, not mobile-friendly, interrupts flow.
- **Where:** `LocationForm.tsx` line 136: `if (!confirm("Delete this location?")) return`
- **Recommendation:** Replace with the `ConfirmDialog` component from `components/ui/Modal.tsx` which already exists.

#### M6. GearForm select elements missing dark mode
- **What the user sees:** The Category and Condition dropdowns in the gear edit form have white backgrounds and light text in dark mode, making them unreadable.
- **Where:** `GearForm.tsx` lines 126-130 and 163-168 -- `<select>` elements lack `dark:` classes on `bg-white` and `text-stone-900`.
- **Recommendation:** Add `dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100` to match other inputs in the same form.

#### M7. BottomNav touch targets are narrow
- **What the user sees:** Five nav items with `py-2` padding. On a phone, each tap target is approximately 40px tall.
- **Impact:** Below the 44px minimum for comfortable mobile touch targets. Easy to mis-tap, especially while camping with cold/dirty fingers.
- **Where:** `BottomNav.tsx` line 29: `py-2`.
- **Recommendation:** Increase to `py-3` for a 48px+ touch target.

#### M8. Vehicle page not in bottom nav
- **What the user sees:** No way to navigate to the Vehicle page from the bottom nav bar. The only path is through the Dashboard stat card.
- **Impact:** 2 taps to reach Vehicle vs 1 tap for other sections. Easy to forget it exists.
- **Where:** `BottomNav.tsx` -- nav items are Home, Gear, Spots, Trips, Chat. Vehicle is absent.
- **Recommendation:** Either add Vehicle to the nav (replacing one item or using a "More" menu) or add a persistent link somewhere accessible.

---

### MINOR

#### m1. TopHeader theme toggle touch target
- **What the user sees:** A 32px sun/moon icon button with `p-2` padding.
- **Where:** `TopHeader.tsx` line 28.
- **Recommendation:** The `p-2` gives ~36px total. Increase to `p-2.5` or add `min-w-[44px] min-h-[44px]` for better touch target.

#### m2. Chat input lacks safe-area consideration
- **What the user sees:** On iPhone with gesture bar, the chat input sits directly above the bottom nav bar with `sticky bottom-20`. This is close but does not account for safe area insets.
- **Where:** `ChatClient.tsx` line 229: `sticky bottom-20`.
- **Recommendation:** Use `bottom-[calc(5rem+env(safe-area-inset-bottom))]` or adjust the AppShell to handle this.

#### m3. GearForm close button is a text character, not an icon
- **What the user sees:** A `x` character (using `&times;`) as the close button. It is small and does not have a visible tap zone.
- **Where:** `GearForm.tsx` line 97-99.
- **Recommendation:** Use the `X` icon from lucide-react with a proper button padding, matching the `Modal` component pattern.

#### m4. Inconsistent search input styling on Gear page
- **What the user sees:** The search input on the Gear page uses inline Tailwind classes instead of the `Input` component from `components/ui/Input.tsx`.
- **Where:** `GearClient.tsx` line 213.
- **Recommendation:** Use the `Input` component for consistency. Same issue applies to all inputs in `TripsClient.tsx` and `VehicleClient.tsx`.

#### m5. Gear category chips have `hover:` styles but no `active:` styles
- **What the user sees:** On mobile, `hover:` has no effect. There is no visual feedback when tapping a chip.
- **Where:** `GearClient.tsx` lines 222-252.
- **Recommendation:** Add `active:scale-95` or `active:bg-stone-400` for tactile mobile feedback.

#### m6. WeatherCard day grid overflows on small screens
- **What the user sees:** For a 7-day trip on a small phone, the grid creates 7 columns that may overflow or compress each column to unreadable widths.
- **Where:** `WeatherCard.tsx` line 162-163 -- `gridTemplateColumns` is set to the number of days.
- **Recommendation:** Cap at 4 columns with horizontal scroll, or use a 2-row layout for 5+ days.

#### m7. Chat messages don't support markdown rendering
- **What the user sees:** Claude responses appear as plain text with `whitespace-pre-wrap`. Markdown formatting (headers, bold, lists, links) displays as raw characters.
- **Where:** `ChatBubble.tsx` line 79.
- **Recommendation:** Add a lightweight markdown renderer (react-markdown or similar) for assistant messages.

#### m8. No loading state on page transitions
- **What the user sees:** When tapping a nav item, there is no visual indicator that the page is loading. On slow connections, the screen appears frozen.
- **Recommendation:** Add a thin progress bar or skeleton layout during server component loading.

#### m9. Spots page controls bar wraps awkwardly on narrow screens
- **What the user sees:** The layer toggle buttons and date picker/upload button try to fit on one line. On phones less than 375px wide, they wrap to 2-3 lines, pushing the map down.
- **Where:** `SpotsClient.tsx` lines 212-268.
- **Recommendation:** Use a collapsible filter drawer or move layer toggles to an icon menu.

---

### ENHANCEMENT

#### E1. No pull-to-refresh
- The app uses server components with initial data. Once loaded, data is stale until page reload. On mobile, users expect pull-to-refresh.
- **Recommendation:** Add client-side refresh mechanism or a visible "refresh" button.

#### E2. No swipe gestures on cards
- Gear items, trip cards, and mod cards could support swipe-to-delete or swipe-to-edit for faster mobile interaction.

#### E3. No haptic feedback on critical actions
- Delete confirmations, packing list checks, and recording actions would benefit from `navigator.vibrate()` on supported devices.

#### E4. Empty states could suggest next actions better
- The gear empty state says "No gear yet" with a link. It could say "Add your first piece of gear -- start with your tent or sleeping bag."
- The trips empty state could mention "Pick a weekend and a spot from your map."

#### E5. No conversation history UI in chat
- Chat resumes the most recent conversation but there is no way to start a new conversation or browse old ones.

#### E6. Dashboard recent gear links to /gear page (not the specific item)
- Each recent gear card links to `/gear` which opens the full list. It should either open that item's edit modal or scroll to it.

#### E7. Trip creation form doesn't validate end date >= start date
- Users can create a trip where the end date is before the start date.

---

## 3. Tap Count Analysis

| Action | Taps from Home | Notes |
|--------|---------------|-------|
| View gear list | 1 | Bottom nav "Gear" |
| Add new gear item | 2 | Gear tab > "+ Add Gear" |
| Edit gear item | 3 | Gear tab > tap item > edit in modal |
| Delete gear item | 5 | Gear tab > tap item > Delete > confirm |
| View map | 1 | Bottom nav "Spots" |
| Save a new spot | 2 | Spots tab > tap map |
| Upload photos | 2 | Spots tab > "+ Add Photos" |
| View trips | 1 | Bottom nav "Trips" |
| Create a trip | 2 | Trips tab > "Plan Trip" |
| Edit a trip | **IMPOSSIBLE** | No UI path exists |
| Delete a trip | **IMPOSSIBLE** | No UI path exists |
| View vehicle | 2 | Home > tap Vehicle stat card |
| Edit vehicle specs | **IMPOSSIBLE** | No UI path exists |
| Add a vehicle mod | 3 | Home > Vehicle card > "Add Mod" |
| Edit a vehicle mod | **IMPOSSIBLE** | No UI path exists |
| Delete a vehicle mod | **IMPOSSIBLE** | No UI path exists |
| Delete a photo | **IMPOSSIBLE** | No UI path exists |
| Start chat | 1 | Bottom nav "Chat" |
| Generate packing list | 3 | Trips tab > expand trip > "Generate with Claude" |
| Generate meal plan | 3 | Trips tab > expand trip > "Generate with Claude" |
| Calculate power budget | 3 | Trips tab > expand trip > "Calculate" |
| Trip prep view | 2 | Trips tab > "Prepare" link |
| Record voice debrief | 3 | Trips tab > expand trip > mic icon |
| Toggle dark mode | 1 | Top header sun/moon icon |

---

## 4. Navigation & Information Architecture

### Structure
```
BottomNav: Home | Gear | Spots | Trips | Chat
TopHeader: Page title + theme toggle
```

### Issues
- **Vehicle is orphaned** -- accessible only via Dashboard stat card (2 taps). Not in BottomNav or any other nav.
- **Trip Prep (`/trips/[id]/prep`) is well-linked** -- accessible from both the trip card "Prepare" link and the Dashboard upcoming trip card. Has a "Back to Trips" link. No dead end.
- **Chat context buttons appear on Gear, Trips, and Spots** when viewing a specific item. Good pattern for cross-page navigation.
- **No breadcrumbs** -- but not needed for this app depth. The only nested page is Trip Prep, which has a back link.

### Recommendation
Either add Vehicle as a 6th nav item (risk: too crowded) or group it under a "More" tab that also holds future features like Settings, Import, etc.

---

## 5. Design System Consistency

### UI Primitives Available
| Component | Purpose | Used in |
|-----------|---------|---------|
| Button | Primary/secondary/danger/ghost actions | VoiceRecordModal, InsightsReviewSheet (2 components) |
| Card | Container with border + rounded corners | NOT USED in any page component |
| Badge | Status/condition labels | InsightsReviewSheet, TripPrepSection (2 components) |
| Input | Form input with label + error | NOT USED in any form |
| Textarea | Multi-line input | NOT USED in any form |
| Select | Dropdown with label + error | NOT USED in any form |
| Modal | Bottom sheet / dialog | NOT USED -- GearForm builds its own modal |
| ConfirmDialog | Delete/action confirmation | NOT USED -- GearClient builds its own |
| Chip / ChipRow | Filter pills | NOT USED -- GearClient builds its own |
| EmptyState | No-data placeholder | ChatClient only (1 component) |
| PageHeader | Page title + action | NOT USED in any page |
| StatCard | Dashboard stat display | NOT USED -- DashboardClient builds its own |

### Assessment
The design system exists but is almost entirely unused. Every major component (GearForm, GearClient, TripsClient, VehicleClient, LocationForm, SpotsClient) inlines its own styles instead of composing from the UI primitives. This leads to:
- Inconsistent button sizes and colors
- Different input styling across forms
- GearClient's delete confirmation duplicates ConfirmDialog exactly
- Category chips duplicate the Chip component exactly

### Dark Mode Coverage
| Component | Dark mode? | Notes |
|-----------|-----------|-------|
| AppShell / layout | Yes | Body bg + text colors |
| TopHeader | Yes | Backdrop blur, border, text |
| BottomNav | Yes | Dark bg variant |
| DashboardClient | Yes | All cards + text |
| GearClient | Yes | List, search, chips |
| GearForm | **Partial** | Inputs OK, selects MISSING |
| TripsClient | Yes | Cards, form, badges |
| VehicleClient | Yes | All sections |
| LocationForm | **NO** | Entire form is light-only |
| SpotsClient | **Partial** | Map controls OK, some elements miss `dark:` |
| ChatClient | Yes | Messages, input |
| WeatherCard | Yes | All sections |
| PackingList | Yes | All sections |
| MealPlan | Yes | All sections |
| PowerBudget | Yes | All sections |
| PhotoUpload | **Partial** | Upload area and results miss `dark:` |

---

## 6. Accessibility Notes

### Good
- Chat message area has `role="log"` and `aria-live="polite"` (ChatClient)
- Theme toggle has `aria-label` (TopHeader)
- Voice record button has `aria-label` (VoiceDebriefButton)
- InsightsReviewSheet uses `role="checkbox"` and `aria-checked` on custom checkboxes
- Chat send button has `aria-label` (ChatInput)
- TripPrepSection uses `aria-expanded` on accordion

### Missing
- GearClient items use `<button>` for the row (good) but lack `aria-label`
- GearForm close button (`&times;`) has no `aria-label`
- Category filter chips lack `aria-pressed` attribute
- PhotoUpload drag zone lacks keyboard accessibility (no `tabIndex`, no keyboard handler)
- Map popups use raw HTML strings with no ARIA -- this is a Leaflet limitation
- Star rating buttons in LocationForm lack `aria-label`
- Navigation links in BottomNav lack `aria-current="page"` for screen readers

---

## 7. Priority Fix Order

1. **B1** -- Trip edit/delete UI (BLOCKER -- breaks core loop)
2. **B2** -- LocationForm dark mode (BLOCKER -- unusable in dark mode)
3. **M1** -- Dashboard trips count hardcoded to 0
4. **M5** -- Replace `confirm()` with ConfirmDialog
5. **M6** -- GearForm select dark mode
6. **M7** -- BottomNav touch targets
7. **M8** -- Vehicle in nav or accessible location
8. **M2/M3** -- Vehicle edit + mod edit/delete
9. **M4** -- Photo delete + metadata edit
10. **m4** -- Adopt UI primitives across forms for consistency
