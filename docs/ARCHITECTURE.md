# Architecture — Camp Commander

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Mobile-first, deploys to Vercel, SSR + static |
| Language | TypeScript | Type safety, better IDE support, catches bugs early |
| Styling | Tailwind CSS | Fast, mobile-first, no CSS files to manage |
| Database | SQLite via Prisma | Local-first, zero config. Switch to Postgres is a one-line change in Prisma when deploying to Vercel |
| ORM | Prisma | Abstracts the database — app code works with any DB. Migrations, type-safe queries |
| Maps | Google Maps JS API (planned) | Will is familiar with it. Free tier is plenty |
| AI | Claude API (planned) | Gear identification, trip planning, Voice Ghostwriter, conversational agent |
| Speech | TBD — Web Speech API or Whisper | Voice Ghostwriter feature. Web Speech is free/browser-native, Whisper is more accurate |
| TTS | TBD — Browser native or ElevenLabs | Agent voice responses for Voice Ghostwriter |
| Weather | TBD — OpenWeatherMap or NOAA | Trip planning, power budget (solar estimates) |
| Hosting | Local dev → Vercel | Designed for easy deployment later |

## Database Schema

### Current Models (6)

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

### Schema Design Principles
- **IDs are strings (cuid)** — works with any database, no auto-increment issues
- **Relations use onDelete: Cascade** where appropriate — delete a trip, its packing items go too
- **Nullable fields are optional** — don't force data entry for fields you might not have yet
- **Timestamps on everything** — createdAt/updatedAt for tracking changes
- **Designed for growth** — adding fields to existing models is a simple migration

## Project Structure

```
/app              — Next.js App Router pages and layouts
/components       — Reusable React components
/lib              — Utilities, database client, API helpers
/prisma           — Schema, migrations, seed script
/public           — Static assets (icons, images)
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
- **Add more models** as features are built (JournalEntry, MealPlan, FloatPlan, PowerDevice, EmergencyContact)
- **Add Claude API integration** in Phase 3
- **Add service worker** for offline support in Phase 4
