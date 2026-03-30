# Architecture — Camp Commander

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Mobile-first, deploys to Vercel, SSR + static |
| Language | TypeScript | Type safety, better IDE support, catches bugs early |
| Styling | Tailwind CSS | Fast, mobile-first, no CSS files to manage |
| Database | SQLite via Prisma | Local-first, zero config. Switch to Postgres is a one-line change in Prisma when deploying to Vercel |
| ORM | Prisma | Abstracts the database — app code works with any DB. Migrations, type-safe queries |
| Maps | Leaflet + OpenStreetMap | Free, no API key, no rate limits. CartoDB Dark Matter for dark mode |
| AI | Claude API (planned) | Gear identification, trip planning, Voice Ghostwriter, conversational agent |
| Speech | TBD — Web Speech API or Whisper | Voice Ghostwriter feature. Web Speech is free/browser-native, Whisper is more accurate |
| TTS | TBD — Browser native or ElevenLabs | Agent voice responses for Voice Ghostwriter |
| Weather | TBD — OpenWeatherMap or NOAA | Trip planning, power budget (solar estimates) |
| Hosting | Local dev → Vercel | Designed for easy deployment later |

## Database Schema

### Current Models (9)

**GearItem** — Everything you own or want for camping
- Categories: shelter, sleep, cook, power, clothing, tools, vehicle
- Tracks condition, weight, storage location, price
- Links to packing lists via PackingItem
- Future: manualPath for saved user guides/PDFs, wattage for power budget

**Vehicle** — Your camping vehicle
- Specs: cargo dimensions, towing, fuel economy, ground clearance
- Links to mods and trips

**VehicleMod** — Modifications to the vehicle
- Tracks cost, install date, description
- Belongs to a Vehicle

**Location** — Saved camping spots
- GPS coordinates, type (dispersed/campground/etc.)
- Signal quality (cell + Starlink), road conditions, water access
- Rating (will become seasonal ratings later)

**Trip** — A camping trip
- Date range, location, vehicle
- Links to packing items
- Future: journal entries, meal plans, float plans, power budgets

**PackingItem** — Links gear to trips
- Which gear is packed for which trip
- Tracks packed status (checkbox)

**Photo** — GPS-tagged photos on the map
- Nullable lat/lon (supports unplaced photos)
- locationSource: "exif" or "vision" (AI-inferred)
- Vision enrichment fields: locationConfidence, visionApproximate, locationDescription
- Links to Location and Trip

**TimelinePoint** — Raw GPS breadcrumbs from Google Maps Location History
- lat/lon, altitude, timestamp, activityType
- Imported via tools/photo-map/extract_timeline.py

**PlaceVisit** — Named place visits from Google Timeline
- Name, address, lat/lon, start/end timestamps, duration
- Confidence level from Google's data

**ActivitySegment** — Movement segments between places
- Activity type (HIKING, IN_VEHICLE, CYCLING, etc.)
- Start/end coordinates and timestamps
- Waypoints stored as JSON string
- Distance in meters

### Schema Design Principles
- **IDs are strings (cuid)** — works with any database, no auto-increment issues
- **Relations use onDelete: Cascade** where appropriate — delete a trip, its packing items go too
- **Nullable fields are optional** — don't force data entry for fields you might not have yet
- **Timestamps on everything** — createdAt/updatedAt for tracking changes
- **Designed for growth** — adding fields to existing models is a simple migration

## Project Structure

```
/app              — Next.js App Router pages and layouts
  /api/photos     — Photo CRUD and upload endpoints
  /api/timeline   — Timeline data query endpoint (with date filtering)
  /api/import     — Bulk import endpoints for Takeout data (photos, timeline)
  /spots          — Interactive map page (server + client components)
/components       — Reusable React components
  SpotMap.tsx     — Leaflet map with clustering, paths, animation, layers
  PhotoUpload.tsx — Drag-drop photo upload with EXIF feedback
/lib              — Utilities, database client, API helpers
/prisma           — Schema, migrations, seed script
/public           — Static assets (icons, images, uploaded photos)
/tools            — Standalone utility scripts
  /photo-map      — Google Takeout extraction + vision enrichment (Python)
/docs             — Project documentation
/00_Context       — Will's personal context, photos, reference material
```

## Key Patterns

### Database Access
- Prisma client singleton in `lib/db.ts` — prevents connection exhaustion in dev
- Server components query the database directly (no API routes needed for reads)
- API routes (`app/api/`) for mutations (create, update, delete)

### Mobile-First
- Tailwind breakpoints: design for phone first, scale up
- `viewport` meta tag locks zoom on mobile
- Touch-friendly tap targets, no hover-dependent UI
- PWA planned for Phase 4 (installable, offline-capable)

### Offline Strategy (Planned)
- Service worker caches all trip data before departure
- Local storage for offline writes (journal entries, checklists)
- Sync queue pushes changes when connection returns
- Downloaded maps, PDFs, recipes available without signal

### Data Flow
```
User → Next.js Page → Server Component → Prisma → SQLite
User → Form Submit → API Route → Prisma → SQLite → Redirect
```

## What Will Change
- **SQLite → Postgres** when deploying to Vercel (one-line Prisma config change)
- **Add more models** as features are built (JournalEntry, MealPlan, FloatPlan, PowerDevice, EmergencyContact). Already added: Photo, TimelinePoint, PlaceVisit, ActivitySegment
- **Add Claude API integration** in Phase 3
- **Add service worker** for offline support in Phase 4
