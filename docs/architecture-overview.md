# Architecture Overview

## System Architecture

Outland OS is a Next.js 16 App Router application with a layered architecture:

```
Browser (mobile-first)
  --> Server Components (data fetching via Prisma)
        --> Client Components (state, interactions, UI)
              --> API Routes (REST, try-catch, JSON responses)
                    --> Prisma ORM --> SQLite (dev.db)
                    --> External Services (Claude API, Open-Meteo)
```

## Layers

### Pages (Server Components)
**Location:** `app/*/page.tsx`

Server components fetch data from Prisma and pass it as props to client components. No state, no interactivity — just data gateways. Uses `Promise.all` for parallel fetching when multiple queries are needed.

**Pages:** Dashboard (`/`), Gear (`/gear`), Trips (`/trips`), Spots (`/spots`), Vehicle (`/vehicle`), Trip Prep (`/trips/[id]/prep`)

### Client Components
**Location:** `components/*.tsx`

All interactivity lives here. Marked with `'use client'`. Handle state management, filtering, modals, forms, and user actions. Each page has a corresponding `*Client.tsx` component (e.g., `GearClient.tsx`, `TripsClient.tsx`).

**Patterns:**
- `useState` for local state (filters, modals, form inputs)
- `useCallback` for memoized handlers
- `useMemo` for expensive computations (filtered/grouped data)
- State-based inline error messages (no `alert()`)
- Loading flags (`isSaving`, `isDeleting`) for async operations

### UI Primitives
**Location:** `components/ui/`

Design system: Button, Card, Badge, Input, Modal, Chip, EmptyState, PageHeader, StatCard. Exported via barrel file (`components/ui/index.ts`). Dark mode via CSS custom properties + localStorage.

### API Routes
**Location:** `app/api/*/route.ts`

RESTful endpoints for all CRUD operations and AI features. Every route follows the same pattern:

```typescript
try {
  // validate input
  // Prisma query or external API call
  return NextResponse.json(result, { status: 200 })
} catch (error) {
  console.error('Action description:', error)
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
}
```

**Routes:** gear, locations, photos, trips, vehicle, weather, packing-list, meal-plan, power-budget, timeline, import

### Data Layer
**Location:** `prisma/schema.prisma`, `lib/db.ts`

SQLite database via Prisma ORM. Single file (`prisma/dev.db`). 10 models:

| Model | Purpose |
|-------|---------|
| GearItem | Camping equipment with categories, conditions, weight, power draw |
| Vehicle | Vehicle specs and cargo dimensions |
| VehicleMod | Modifications/upgrades linked to vehicle |
| Location | Saved spots with GPS, road conditions, cell signal, ratings |
| Photo | Uploaded images with EXIF GPS, linked to locations and trips |
| Trip | Trip plans with date range, destination, weather notes |
| PackingItem | Junction table linking trips to gear (packed boolean) |
| TimelinePoint | GPS breadcrumbs from Google Takeout |
| PlaceVisit | Place visits from Google Takeout |
| ActivitySegment | Activity segments from Google Takeout |

### External Services
**Location:** `lib/claude.ts`, `lib/weather.ts`

| Service | Purpose | Auth |
|---------|---------|------|
| Claude API (Anthropic SDK) | Packing list generation, meal planning | `ANTHROPIC_API_KEY` |
| Open-Meteo | Weather forecasts for trip locations | None (free) |
| Leaflet + OpenStreetMap | Interactive maps | None (free) |

## Data Flow

### Typical Page Load
```
Browser --> app/gear/page.tsx (server)
              --> prisma.gearItem.findMany()
              --> passes items to <GearClient initialItems={items} />
                    --> useState, filtering, renders UI
                    --> User action --> fetch('/api/gear', { method: 'POST' })
                    --> API route --> Prisma mutation --> JSON response
                    --> Client updates local state
```

### AI Feature Flow
```
User requests packing list
  --> POST /api/packing-list { tripId, gear, weather }
        --> lib/claude.ts builds prompt with gear inventory + weather data
        --> Anthropic SDK --> Claude API
        --> Parse JSON response
        --> Return structured packing categories + tips
```

### Trip Prep Flow (Phase 2)
```
/trips/[id]/prep
  --> Server fetches trip + all related data
  --> TripPrepClient renders collapsible sections
        --> Each section (weather, packing, meals, power) shows status badge
        --> Traffic light indicators: emerald (ready), amber (needs attention), gray (not started)
        --> Prep API returns structured JSON (reusable by future chat agent)
```

## Key Patterns

- **Server fetches, client renders** — no client-side data fetching on initial load
- **Config-driven extensibility** — prep sections use a registry pattern so new sections slot in without JSX changes
- **Mobile-first** — bottom tab nav, touch-friendly UI, responsive design
- **Dark mode** — CSS custom properties + localStorage toggle
- **No auth** — single user, no login system
- **Import path alias** — `@/*` maps to project root

## What's Coming Next

| Phase | What | Status |
|-------|------|--------|
| Phase 3: Knowledge Base | NC camping RAG corpus with hybrid retrieval (FTS5 + sqlite-vec) | Planned |
| Phase 4: Chat Agent | Messenger-style AI assistant with tool use | Not started |
| Phase 5: Intelligence | AI trip recommendations + voice trip debrief | Not started |

Architecture additions for Phase 3+:
- `lib/rag/` — ingest, search, context assembly for RAG
- `better-sqlite3` + `sqlite-vec` — vector embeddings alongside Prisma
- `voyageai` SDK — Voyage-3-lite embeddings
- FTS5 virtual table — keyword search via raw SQL migration
- SSE streaming — for future chat agent responses

See `.planning/ROADMAP.md` for full details.
