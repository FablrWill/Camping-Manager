# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
project-root/
├── app/                          # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── gear/                # Gear CRUD endpoints
│   │   ├── locations/           # Location CRUD endpoints
│   │   ├── photos/              # Photo CRUD & image upload
│   │   ├── packing-list/        # AI packing list generation
│   │   ├── trips/               # Trip CRUD endpoints
│   │   ├── vehicle/             # Vehicle CRUD endpoints
│   │   ├── weather/             # Weather forecast endpoint
│   │   ├── timeline/            # Timeline data queries
│   │   └── import/              # Data import endpoints (photos, timeline)
│   ├── gear/                     # Gear inventory page
│   ├── spots/                    # Map page with Leaflet
│   ├── trips/                    # Trip planning page
│   ├── vehicle/                  # Vehicle management page
│   ├── layout.tsx                # Root layout with AppShell, theme script
│   ├── page.tsx                  # Home dashboard
│   └── globals.css               # Base Tailwind styles
├── components/                   # React client & server components
│   ├── ui/                       # Reusable UI primitives (Button, Card, Modal, etc.)
│   ├── GearClient.tsx            # Gear list with filtering & modals
│   ├── TripsClient.tsx           # Trip list & trip detail modal
│   ├── VehicleClient.tsx         # Vehicle specs & mods list
│   ├── SpotsClient.tsx           # Map rendering with Leaflet
│   ├── DashboardClient.tsx       # Home page stats & recent items
│   ├── PackingList.tsx           # Packing list display with checkboxes
│   ├── GearForm.tsx              # Gear add/edit modal
│   ├── LocationForm.tsx          # Location add/edit modal
│   ├── PhotoUpload.tsx           # File upload for photos
│   ├── WeatherCard.tsx           # Weather forecast display
│   ├── AppShell.tsx              # Layout shell (TopHeader, BottomNav, children)
│   ├── TopHeader.tsx             # Header bar with title & settings
│   ├── BottomNav.tsx             # Mobile navigation tabs
│   └── ThemeProvider.tsx         # Dark mode context & toggle
├── lib/                          # Utility functions & service clients
│   ├── db.ts                     # Prisma client singleton (global scope)
│   ├── claude.ts                 # Claude API wrapper for packing list generation
│   ├── weather.ts                # Weather API calls & data formatting
│   ├── exif.ts                   # EXIF data extraction from photos
│   └── exif-parser.d.ts          # TypeScript types for exif-parser
├── prisma/
│   ├── schema.prisma             # Database schema (9 models)
│   └── migrations/               # Database migration files (timestamped)
├── tools/
│   └── photo-map/                # Python scripts for Google Takeout processing
├── docs/                         # Project documentation
│   ├── plans/                    # Implementation plans
│   ├── changelog/                # Session changelog files
│   ├── CHANGELOG.md              # Index of all sessions
│   ├── STATUS.md                 # Current session number & feature status
│   └── FEATURES.md               # Feature roadmap & specifications
├── data/                         # Static seed data (dev use)
├── 00_Context/                   # Will's personal context (voice, style, preferences)
├── public/                       # Static assets & uploaded photos directory
├── package.json                  # Dependencies (Next.js, Prisma, Tailwind, etc.)
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
├── eslint.config.mjs             # ESLint rules
├── postcss.config.mjs            # PostCSS config for Tailwind
├── CLAUDE.md                     # Project instructions & collaboration guide
└── TASKS.md                      # Session work items & feature tracking
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router filesystem. Contains all page routes and API endpoints.
- Contains: Page.tsx files for rendering, route.ts files for API endpoints
- Key files: `layout.tsx` (root metadata & theme script), `page.tsx` (home dashboard)

**app/api/:**
- Purpose: RESTful backend endpoints for all CRUD operations
- Contains: Route handler files using Next.js Request/Response API
- Key files: `gear/route.ts`, `locations/route.ts`, `photos/upload/route.ts`, `packing-list/route.ts`
- Pattern: Each endpoint has GET (list/fetch), POST (create), PUT (update in [id]/route.ts), DELETE (in [id]/route.ts)

**components/:**
- Purpose: Reusable React components (server + client)
- Contains: Form modals, data-driven lists, UI primitives, layout wrappers
- Key files: `*Client.tsx` for state-heavy pages, `*Form.tsx` for modals, `ui/*.tsx` for primitives

**components/ui/:**
- Purpose: Atomic UI components with zero business logic
- Contains: Button, Card, Badge, Chip, Modal, Input, PageHeader, StatCard, EmptyState
- Pattern: Accept className prop for styling; use Tailwind classes; support dark mode

**lib/:**
- Purpose: Utility functions and service clients
- Contains: Database client, API wrappers, parsers, formatters
- Key files: `db.ts` (Prisma singleton), `claude.ts` (packing list AI), `weather.ts` (forecast fetching)

**prisma/:**
- Purpose: Database schema and migrations
- Contains: schema.prisma (data model), timestamped migration files
- Key files: `schema.prisma` (9 models: GearItem, Vehicle, VehicleMod, Location, Photo, Trip, PackingItem, TimelinePoint, PlaceVisit, ActivitySegment)

**tools/photo-map/:**
- Purpose: Offline Python tooling for processing Google Takeout exports
- Contains: Scripts for extracting photos, EXIF data, location enrichment via Claude vision
- Used by: Manual data import workflows before uploading to app

**docs/:**
- Purpose: Project documentation and session tracking
- Contains: Implementation plans, per-session changelogs, feature roadmap
- Key files: `CHANGELOG.md` (index), `changelog/session-NN.md` (one per session), `STATUS.md` (current session number)

**00_Context/:**
- Purpose: Will's personal context files for tone, preferences, and style
- Contains: Voice notes, working style, decision log
- Used by: Claude instances for understanding collaboration preferences

**public/:**
- Purpose: Static assets and uploaded photo storage
- Contains: Favicon, SVGs, and `/photos/[cuid].jpg` uploaded images
- Pattern: Photos uploaded via POST `/api/photos/upload` are compressed and stored here

## Key File Locations

**Entry Points:**
- `app/layout.tsx` — Root layout wrapping all pages; includes theme script for dark mode
- `app/page.tsx` — Home dashboard; fetches stats in parallel, renders DashboardClient
- `app/gear/page.tsx` — Gear inventory page; server-side fetch, passes to GearClient
- `app/spots/page.tsx` — Map page; fetches locations & photos, renders map component
- `app/trips/page.tsx` — Trip planning page; fetches trips, renders TripsClient
- `app/vehicle/page.tsx` — Vehicle management page; fetches vehicle & mods, renders VehicleClient

**Configuration:**
- `tsconfig.json` — Path alias `@/` maps to root directory (e.g., `@/lib` = `./lib`)
- `next.config.ts` — Next.js config (redirects, image optimization, etc.)
- `prisma/schema.prisma` — SQLite datasource URL from `DATABASE_URL` env var
- `package.json` — Dependencies include Next.js 16, Prisma, Tailwind CSS, Leaflet, Anthropic SDK

**Core Logic:**
- `lib/db.ts` — Prisma singleton; prevents multiple PrismaClient instances in development
- `lib/claude.ts` — `generatePackingList()` function; orchestrates Claude API call with trip context
- `lib/weather.ts` — Fetches weather forecast; integrates with weather data in packing list flow
- `lib/exif.ts` — Extracts GPS coordinates and timestamp from uploaded photos
- `app/api/gear/route.ts` — GET (list with filters), POST (create); pattern for all CRUD routes
- `app/api/import/timeline/route.ts` — Batch imports Google Maps timeline data (TimelinePoint, PlaceVisit, ActivitySegment)
- `app/api/packing-list/route.ts` — Calls `generatePackingList()` and saves items to PackingItem junction table

**Testing:**
- Not yet implemented (no test directory or jest config)

## Naming Conventions

**Files:**
- Page files: `page.tsx` in each route folder (e.g., `app/gear/page.tsx`)
- API routes: `route.ts` in each endpoint folder (e.g., `app/api/gear/route.ts`)
- Client components: `*Client.tsx` for state-heavy, interactive components (e.g., `GearClient.tsx`)
- Form modals: `*Form.tsx` for add/edit modals (e.g., `GearForm.tsx`)
- UI primitives: lowercase noun (e.g., `Button.tsx`, `Card.tsx`, `Modal.tsx`)

**Directories:**
- Route folders: singular noun matching domain (gear, trips, vehicle, locations, photos)
- API subfolder nesting: `[id]` for resource-specific operations (e.g., `app/api/gear/[id]/route.ts`)
- Nested imports: `mods` folder under `vehicle/[id]/` for related resources (e.g., `app/api/vehicle/[id]/mods/route.ts`)

**Functions & Variables:**
- Event handlers: `handle*` prefix (e.g., `handleSave`, `handleDelete`, `handleSubmit`)
- Fetch wrappers: `generate*` or `fetch*` prefix (e.g., `generatePackingList`, `fetchWeather`)
- Boolean state: `is*` or `show*` prefix (e.g., `isWishlist`, `showForm`, `isSaving`)
- Filtered/grouped data: `*Filtered` or `*Grouped` suffix (e.g., `filtered`, `grouped` in GearClient)

**Types & Interfaces:**
- Prisma models: PascalCase (e.g., `GearItem`, `Location`, `Photo`)
- Props interfaces: `*Props` suffix (e.g., `GearFormProps`, `SpotsClientProps`)
- Data transfer: Inline interfaces at file top (e.g., `PathPoint`, `PlaceVisitInput` in import/timeline/route.ts)

## Where to Add New Code

**New Feature (complete CRUD):**
- Primary code: `app/api/[domain]/route.ts` for endpoints, `components/[Domain]Client.tsx` for UI
- Add/edit modal: `components/[Domain]Form.tsx`
- Database: Add model to `prisma/schema.prisma`, run `npx prisma migrate dev`
- Page: `app/[domain]/page.tsx` (server component fetching data)
- Example: To add "Tags", create `Tag` model, `app/api/tags/route.ts`, `components/TagForm.tsx`, `app/tags/page.tsx`

**New Component/Module:**
- Shared UI: `components/ui/[ComponentName].tsx` if reusable, else `components/[FeatureName].tsx`
- Utilities: `lib/[domain].ts` (e.g., `lib/exif.ts`, `lib/weather.ts`)
- API helpers: Export functions from `lib/[domain].ts`, import in `app/api/*/route.ts`
- Example: Weather integration goes in `lib/weather.ts`, called from API routes and components

**Utilities & Helpers:**
- Shared helpers: `lib/[domain].ts` (grouped by domain, not mixed)
- Constants: Define near usage (e.g., `CATEGORIES` in GearClient.tsx, `CATEGORY_EMOJIS` in claude.ts)
- Type definitions: Inline in component/route file unless shared across 3+ files
- Example: Color mappings for condition badges stay in `components/GearClient.tsx`

## Special Directories

**prisma/migrations/:**
- Purpose: Timestamped migration files tracking schema changes
- Generated: Automatically by `npx prisma migrate dev`
- Committed: Yes (tracks history for team collaboration)
- Pattern: Name reflects the change (e.g., `20260330012459_add_timeline_models_and_photo_enhancements`)

**public/photos/:**
- Purpose: Uploaded photo storage (compressed copies)
- Generated: By `POST /api/photos/upload` endpoint
- Committed: No (.gitignore excludes photos/\*.jpg)
- Pattern: Files named by CUID (e.g., `/photos/clzx1y2a3b4c5d6e7f8g9h0ij.jpg`)

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes, by `next build` and dev server
- Committed: No (.gitignore)
- Note: Delete if build becomes stale

**00_Context/:**
- Purpose: Will's personal notes and preferences
- Generated: By Will manually
- Committed: Yes (shared collaboration context)
- Pattern: Markdown files organized by topic (photos/, voice/, etc.)

---

*Structure analysis: 2026-03-30*
