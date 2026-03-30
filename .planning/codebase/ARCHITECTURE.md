# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Layered Next.js 16 (App Router) with server-side data fetching and client-side interactivity. Follows a clear separation between server components (data fetching), client components (state & UI), and API routes (business logic).

**Key Characteristics:**
- Server Components as data gateways with Promise.all for parallel fetching
- Client Components handle all state, filtering, and modal interactions
- RESTful API routes with standardized error handling (try-catch + JSON responses)
- Prisma ORM for SQLite operations with proper relationship definitions
- Claude API integration for AI-powered features (packing list generation)
- Tailwind CSS styling with dark mode support via localStorage persistence

## Layers

**Presentation Layer (UI):**
- Purpose: Render pages and components; handle user interactions; manage local state
- Location: `app/*/page.tsx`, `components/*.tsx`
- Contains: Server pages (data fetching only), client components (state + UI)
- Depends on: API routes, lib utilities, Tailwind CSS
- Used by: Browser/Next.js runtime

**API Layer (Business Logic):**
- Purpose: RESTful endpoints for CRUD operations, imports, and AI features
- Location: `app/api/**/*.ts`
- Contains: Route handlers with request validation, database mutations, external service calls
- Depends on: Prisma client, external APIs (Claude, Weather), lib utilities
- Used by: Client components, browser fetch requests

**Data Access Layer (ORM):**
- Purpose: Abstract database operations with relationship management
- Location: `lib/db.ts`, `prisma/schema.prisma`
- Contains: Prisma client instance, schema definitions (9 models)
- Depends on: SQLite database file, Prisma CLI
- Used by: All API routes

**External Integration Layer:**
- Purpose: Interface with external services (Claude API, weather APIs)
- Location: `lib/claude.ts`, `lib/weather.ts`
- Contains: Service clients, API call wrappers, response parsing
- Depends on: Environment variables, npm packages (Anthropic SDK)
- Used by: API routes

## Data Flow

**Gear Management Flow:**

1. User navigates to `/gear` page
2. `app/gear/page.tsx` (server component) fetches all gear items via `prisma.gearItem.findMany()`
3. Passes gear array to `<GearClient>` with initial state
4. User clicks "Add Gear" → `<GearForm>` modal opens
5. Form submission → fetch POST `/api/gear` with FormData
6. `app/api/gear/route.ts` validates, calls `prisma.gearItem.create()`, returns JSON
7. Client updates local state with response
8. UI re-renders without page reload

**Trip Packing List Generation Flow:**

1. User creates trip in `app/trips` with start/end dates
2. Clicks "Generate Packing List"
3. Client fetches trip context: gear inventory, weather forecast, location details
4. Sends data to `POST /api/packing-list`
5. Route handler calls `generatePackingList()` from `lib/claude.ts`
6. Claude API processes prompt with gear inventory + weather + trip details
7. Returns structured JSON with categorized items and tips
8. Client displays packing list with checkboxes for each item
9. Packing state stored in `PackingItem` junction table (tripId + gearId)

**Location & Photo Mapping Flow:**

1. User imports Google Takeout timeline data via `/api/import/timeline`
2. Server processes three datasets in parallel:
   - `TimelinePoint` — raw GPS coordinates with activity type
   - `PlaceVisit` — semantic locations (places Google identified)
   - `ActivitySegment` — movement records (hiking, driving, etc.)
3. Data stored in SQLite with indexes on timestamp fields
4. `app/spots/page.tsx` fetches locations + photos with coordinates
5. `<SpotsClient>` renders Leaflet map with markers
6. Photos with EXIF/vision-inferred coordinates plot on map
7. User can click markers to view details or create trips at those locations

**Data Serialization:**

Server components use `.toISOString()` for Date objects before passing to client:
```
visitedAt: l.visitedAt?.toISOString() ?? null
```
This prevents serialization errors in Next.js server-to-client props.

**State Management:**

- **Local state:** useState for filtering, modals, form inputs (GearClient, TripsClient)
- **URL state:** None currently (could add query params for pagination/filters)
- **Database state:** Prisma mutations for persistence
- **Transient state:** Loading flags (isSaving, isDeleting) stored in React state

## Key Abstractions

**GearItem:**
- Purpose: Represents physical camping equipment with condition tracking
- Examples: `app/api/gear/route.ts`, `components/GearClient.tsx`
- Pattern: Full CRUD via REST API; client-side filtering; categorized display

**Trip:**
- Purpose: Container linking start/end dates, location, vehicle, and packed items
- Examples: `app/api/trips/route.ts`, `components/TripsClient.tsx`
- Pattern: Packing items stored in junction table (PackingItem); supports multi-day events

**Location:**
- Purpose: Geographic point with camping metadata (cell signal, road condition, rating)
- Examples: `app/api/locations/route.ts`, `components/SpotMap.tsx`
- Pattern: References Photos; optional relationship to Trips; indexed by coordinates

**Photo:**
- Purpose: Uploaded or imported image with EXIF/AI-inferred location
- Examples: `app/api/photos/route.ts`, `lib/exif.ts`
- Pattern: Coordinates can come from EXIF, Claude vision, or user; references Location & Trip

**PackingList (computed):**
- Purpose: AI-generated checklist from gear inventory + weather + trip context
- Examples: `lib/claude.ts`, `components/PackingList.tsx`
- Pattern: Generated on-demand by Claude; persisted items tracked in PackingItem table

**Timeline Data (bulk import):**
- Purpose: Google Maps timeline components (points, places, activities) for travel history
- Examples: `app/api/import/timeline/route.ts`, `prisma/schema.prisma`
- Pattern: Batch import with optional delete-before-insert; indexes on timestamp for querying

## Entry Points

**Home Dashboard (`/`):**
- Location: `app/page.tsx` → `components/DashboardClient.tsx`
- Triggers: App load, navigation click
- Responsibilities: Show overview stats (gear count, locations, photos), display recent gear updates, summary totals (weight)

**Gear Inventory (`/gear`):**
- Location: `app/gear/page.tsx` → `components/GearClient.tsx`
- Triggers: Navigation click, "Add/Edit Gear" action
- Responsibilities: Fetch all gear, render filtered/grouped list, modal for add/edit/delete, search and category filtering

**Trip Planning (`/trips`):**
- Location: `app/trips/page.tsx` → `components/TripsClient.tsx`
- Triggers: Navigation click, "Create Trip" action
- Responsibilities: List trips with date ranges, open trip detail modal, generate packing lists, manage trip metadata

**Map & Locations (`/spots`):**
- Location: `app/spots/page.tsx` → `components/SpotsClient.tsx` with Leaflet
- Triggers: Navigation click, marker click
- Responsibilities: Render interactive map with location markers and photo pins, show location details, create new location from map

**Vehicle Management (`/vehicle`):**
- Location: `app/vehicle/page.tsx` → `components/VehicleClient.tsx`
- Triggers: Navigation click, "Add/Edit" action
- Responsibilities: Show vehicle specs, list mods/upgrades, add new mod entries, track cargo capacity and capabilities

## Error Handling

**Strategy:** Try-catch blocks in all API routes with console.error + standardized JSON error response

**Patterns:**

All API routes follow this structure:
```typescript
export async function GET/POST() {
  try {
    // business logic
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to [action]:', error)
    return NextResponse.json({ error: 'Failed to [action]' }, { status: 500 })
  }
}
```

Client components use try-catch + state-based error display (no alert()):
```typescript
try {
  await onSave(data)
} catch (err) {
  setError('Failed to save. Please try again.')
} finally {
  setSaving(false)
}
```

Error messages display in-app in red boxes (e.g., GearForm, modals) before clearing after action.

## Cross-Cutting Concerns

**Logging:** `console.error()` on every API route catch block; includes specific action context

**Validation:**
- Required fields checked before DB operations (e.g., name + category for gear)
- Returns 400 Bad Request if validation fails
- Client-side validation via input type=text/number constraints

**Authentication:** None currently (single-user app); could add session middleware later

**Dark Mode:** Stored in localStorage as `cc-theme`; theme script in layout head prevents flash-of-wrong-theme; class-based (dark:) styling throughout

**Date Serialization:** Server components convert Date → ISO string before sending to client; client parses ISO strings as needed

---

*Architecture analysis: 2026-03-30*
