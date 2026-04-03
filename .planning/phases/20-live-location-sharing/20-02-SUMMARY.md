---
phase: 20-live-location-sharing
plan: "02"
subsystem: ui
tags: [location-sharing, leaflet, nextjs, react, tailwind, cloudflare-tunnel]

dependency_graph:
  requires:
    - phase: 20-01
      provides: SharedLocation model, POST/GET/DELETE API routes, public slug read endpoint, lib/share-location.ts (generateSlug, timeAgo)
  provides:
    - app/share/layout.tsx — bare layout override bypassing AppShell for all /share/* routes
    - app/share/[slug]/page.tsx — Server Component fetching SharedLocation, 404 on miss
    - app/share/[slug]/share-page-client.tsx — Client Component with dynamic Leaflet import (ssr:false)
    - components/ShareMap.tsx — minimal Leaflet map with icon fix and XSS-safe popup
    - components/ShareLocationButton.tsx — Share/Update/Stop location modal for private app UI
    - ShareLocationButton wired into app/spots/spots-client.tsx
  affects:
    - Any phase that adds toolbar controls to the Spots page

tech-stack:
  added: []
  patterns:
    - Server Component fetches DB data → passes serialized props to Client Component (same as spots/page.tsx)
    - ssr:false dynamic import must live in a Client Component (not Server Component) in Next.js App Router
    - Bare layout.tsx at route segment level overrides root layout completely — must render <html><body> directly
    - escHtml() for Leaflet popup innerHTML — XSS prevention

key-files:
  created:
    - app/share/layout.tsx
    - app/share/[slug]/page.tsx
    - app/share/[slug]/share-page-client.tsx
    - components/ShareMap.tsx
    - components/ShareLocationButton.tsx
  modified:
    - app/spots/spots-client.tsx

key-decisions:
  - "ssr:false dynamic import moved to share-page-client.tsx (Client Component) — Next.js App Router forbids ssr:false in Server Components"
  - "SharePageClient renders full layout (map + info bar) — Server Component only fetches data and passes props"
  - "ShareLocationButton loads current share status on mount via GET /api/share/location — pre-populates form for editing"

patterns-established:
  - "Pattern: Extract dynamic(ssr:false) to a Client Component wrapper — required in Next.js 16 App Router"
  - "Pattern: Bare segment layout (renders <html>) overrides root layout for public-facing pages"

requirements-completed:
  - LOCATION-SHARE-02
  - LOCATION-SHARE-03
  - LOCATION-SHARE-04
  - LOCATION-SHARE-05

duration: 203s
completed: "2026-04-03"
---

# Phase 20 Plan 02: Share UI — Summary

**Public /share/[slug] page with bare Leaflet map (no AppShell), ShareLocationButton modal with start/update/stop controls wired into Spots page toolbar.**

## Performance

- **Duration:** ~3.5 min (203s)
- **Started:** 2026-04-03T05:52:53Z
- **Completed:** 2026-04-03T05:56:16Z
- **Tasks:** 2 of 2 auto tasks completed (2 checkpoint tasks pending user action)
- **Files modified:** 6

## Accomplishments

- Bare share layout bypasses AppShell entirely — /share/* renders clean public pages
- ShareMap component replicates SpotMap icon fix and escHtml XSS pattern, no clusters or dark mode
- Server Component page fetches SharedLocation from DB directly, returns notFound() for unknown slugs
- ShareLocationButton: full state machine (idle/loading/active/error), copy-to-clipboard, no alert()
- ShareLocationButton rendered in Spots page controls bar alongside existing photo/date controls

## Task Commits

1. **Task 1: Public share page — bare layout + Server Component + ShareMap** - `afc59e5` (feat)
2. **Task 2: ShareLocationButton component + wire into Spots page** - `fcfd90b` (feat)

## Files Created/Modified

- `app/share/layout.tsx` — Bare layout rendering `<html><body>` directly, no AppShell
- `app/share/[slug]/page.tsx` — Server Component: fetches SharedLocation, serializes updatedAt, returns notFound() on miss
- `app/share/[slug]/share-page-client.tsx` — Client Component: dynamic(ssr:false) Leaflet import, full-screen map + info bar
- `components/ShareMap.tsx` — Minimal Leaflet map, icon fix, escHtml, single marker with popup
- `components/ShareLocationButton.tsx` — GET on mount, POST/DELETE wired to API, modal with all three states
- `app/spots/spots-client.tsx` — Import and render `<ShareLocationButton />` in controls bar

## Decisions Made

- `ssr:false` in `dynamic()` cannot appear in a Server Component in Next.js 16 App Router — moved to `share-page-client.tsx`
- Server Component passes pre-computed `updatedAtLabel` string (from `timeAgo()`) to avoid serializing Date objects across the server/client boundary
- ShareLocationButton pre-populates lat/lon/label from GET /api/share/location on mount so form shows current values when editing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted dynamic(ssr:false) to Client Component**
- **Found during:** Task 1 verification (build)
- **Issue:** Next.js 16 Turbopack rejected `ssr: false` in `dynamic()` when called from a Server Component (`app/share/[slug]/page.tsx`)
- **Fix:** Created `app/share/[slug]/share-page-client.tsx` as a `'use client'` component that holds the `dynamic()` import and renders the layout. Server Component (`page.tsx`) just fetches data and passes props.
- **Files modified:** app/share/[slug]/share-page-client.tsx (created), app/share/[slug]/page.tsx (simplified)
- **Verification:** Build compiled successfully (`✓ Compiled successfully`)
- **Committed in:** afc59e5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — Next.js App Router constraint)
**Impact on plan:** Required adding one extra file (share-page-client.tsx). No behavior change. Pattern now documented for future phases.

## Issues Encountered

The `/trips` page has a pre-existing Prisma prerender failure in the worktree (`P2022: column main.Trip.emergencyContactName does not exist`) — same out-of-scope issue documented in Plan 01 Summary. Does not affect TypeScript compilation or our changes.

## User Setup Required

**Cloudflare Tunnel setup is required for family/public access.** Task 4 (checkpoint:human-action) covers the full setup steps. Summary of what's needed:

1. `brew install cloudflared` on Mac mini
2. `cloudflared tunnel login` → select your domain
3. `cloudflared tunnel create outland-share`
4. Create `~/.cloudflared/config.yml` routing /share/* and /api/share/* to localhost:3000
5. `cloudflared tunnel route dns outland-share share.yourdomain.com`
6. Set `NEXT_PUBLIC_BASE_URL=https://share.yourdomain.com` in `.env`
7. `sudo cloudflared service install` to run on reboot

See Task 4 in the PLAN.md for exact commands.

## Known Stubs

None — all components are fully wired. ShareLocationButton reads from and writes to live API endpoints. The share URL uses `process.env.NEXT_PUBLIC_BASE_URL` which defaults to empty string (relative URL) until Cloudflare Tunnel is configured — this is intentional and documented in user_setup.

## Next Phase Readiness

- Phase 20 code complete — all 5 LOCATION-SHARE requirements implemented
- Cloudflare Tunnel setup (Task 4) is the final step to make share URLs publicly accessible
- After tunnel is live, Will can share his location with family from the Spots page toolbar

---
*Phase: 20-live-location-sharing*
*Completed: 2026-04-03*
