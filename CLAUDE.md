# Outland OS — Project Instructions

## What This Is
A personal car camping assistant and travel guide built as a mobile-friendly web app. Built by Will Sink to manage gear, plan trips, track locations, and learn Claude Code.

## Tech Stack
- **Framework:** Next.js 16 (App Router) — mobile-first responsive design
- **Styling:** Tailwind CSS
- **Database:** SQLite via Prisma (local-first, easy to migrate later)
- **Maps:** Leaflet + OpenStreetMap (free, no API key needed)
- **Auth:** None for now (single user)
- **AI:** Claude API for gear identification, trip recommendations, conversational agent
- **Hosting:** Local dev for now, designed for easy deployment to Vercel later

## Project Structure
```
/app              — Next.js app router pages
  /api/photos     — Photo CRUD and upload
  /api/timeline   — Timeline data with date filtering
  /api/import     — Bulk import from Google Takeout
  /spots          — Interactive map page
/components       — React components (SpotMap, PhotoUpload)
/lib              — Utilities, database client, API helpers
/prisma           — Database schema and migrations (9 models)
/public           — Static assets + uploaded photos
/tools/photo-map  — Python scripts for Google Takeout extraction + AI enrichment
/docs             — Project documentation, planning, specs
/00_Context       — Will's personal context files (voice, style, working rules)
```

## Working With Will
- He has ADHD — keep outputs scannable, use bullets, avoid walls of text
- Give recommendations with reasoning, not lists of options
- Deliver finished work, not drafts or checkpoints
- Be direct. No hedging, no filler, no performative enthusiasm
- He's learning — explain decisions but don't over-explain
- He thinks in prompts and understands AI systems well
- Mobile-first: he primarily works from his phone

## Coding Standards
- TypeScript throughout
- Components are functional, using hooks
- Keep it simple — this is a personal tool, not enterprise software
- No premature abstractions. Build what's needed now.
- Commit messages: imperative mood, concise
- All API routes must have try-catch error handling with console.error + JSON error response
- No `alert()` in components — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays — never include state that the hook itself updates

## Documentation Standards
- **TASKS.md** is the single source of truth. Update it every session.
- **Changelog** is split into one file per session in `docs/changelog/`:
  - File naming: `session-NN.md` (zero-padded for sort). Parallel sessions use suffixes: `session-05a.md`, `session-05b.md`
  - Each session creates its own file — **never edit another session's file**
  - `docs/CHANGELOG.md` is just an index table. Add one row when you create a session file.
  - This structure prevents merge conflicts when parallel worktrees both write changelog entries.
  - To find the next session number: read the index table in `docs/CHANGELOG.md`, pick the next unused number. If another session is running in parallel on the same day, use a suffix (e.g., 12a, 12b).
- **STATUS.md** must match the latest session number
- When a feature listed in TASKS.md or FEATURE-PHASES.md is built, mark it ✅ Done immediately — don't leave stale "Ready" markers

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Outland OS**

A personal second brain for car camping — an AI-powered knowledge system that has the camping expertise, local area knowledge, and logistical memory that Will doesn't. Not a commercial product or app for others. It's a personal tool that manages gear, plans trips, tracks spots, and uses Claude as a camping-expert agent. Built as a mobile-first web app for one user (Will Sink, Asheville NC, Santa Fe Hybrid camper).

**Core Value:** **Personal camping second brain** — a system that knows more about camping logistics, gear, and the local area than Will does. Everything lives in one place, and the AI layer provides the expertise. The value isn't any single feature — it's having a knowledgeable assistant that remembers everything and thinks ahead.

### Constraints

- **Single user** — no auth, no multi-tenancy complexity
- **Budget-conscious** — free APIs where possible (Open-Meteo, OSM)
- **ADHD-friendly dev** — small tasks, clear progress, scannable outputs
- **Mobile-first** — phone is primary device
- **Learning project** — Will is learning to code; explain decisions
- **HA hardware not available yet** — device registry now, bridge later (~mid-April 2026)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 - Entire codebase (app, lib, API routes)
- JSX/TSX - React components and pages
- JavaScript - Configuration files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`)
## Runtime
- Node.js (no specific version pinned in package.json)
- npm (lockfile present: `package-lock.json`)
## Frameworks
- Next.js 16.2.1 - Full-stack framework with App Router for mobile-first web app
- React 19.2.4 - UI component library
- Tailwind CSS 4 (via `@tailwindcss/postcss`) - Utility-first CSS framework
- PostCSS 4 - CSS processing
- Prisma 6.19.2 - ORM for SQLite with migrations and seeding
- Leaflet 1.9.4 - Interactive map library
- Leaflet.markercluster 1.5.3 - Map marker clustering
- Lucide React 1.7.0 - Icon library
## Key Dependencies
- `@prisma/client` 6.19.2 - Database client, loads schema from `prisma/schema.prisma`
- `@anthropic-ai/sdk` 0.80.0 - Claude API integration for packing list generation (`lib/claude.ts`)
- `sharp` 0.34.5 - Image compression and EXIF rotation for photo uploads and imports
- `exif-parser` 0.1.12 - EXIF metadata extraction from photos for GPS coordinates
- `@types/node` 20, `@types/react` 19, `@types/react-dom` 19 - TypeScript type definitions
- `@types/leaflet` 1.9.21, `@types/leaflet.markercluster` 1.5.6 - Leaflet type definitions
## Configuration
- Configured via `.env` file (see `.env.example` for required variables)
- `ANTHROPIC_API_KEY` - Required for AI features (packing list, meal planning)
- `DATABASE_URL` - Required, points to local SQLite: `file:./dev.db`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Optional, for future Google Maps integration
- `next.config.ts` - Next.js configuration (minimal, using defaults)
- `tsconfig.json` - TypeScript compiler settings with ES2017 target, strict mode, path alias `@/*`
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration using Next.js core-web-vitals and TypeScript rules
- `prisma/schema.prisma` - Data model (9 models: GearItem, Vehicle, VehicleMod, Location, Photo, Trip, PackingItem, TimelinePoint, PlaceVisit, ActivitySegment)
- `prisma/migrations/` - Sequenced migration files tracking schema evolution
- `prisma/seed.ts` - Seed script for initial data (invoked via `npm run db:seed`)
## Scripts
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Create/apply Prisma migrations
- `npm run db:seed` - Run seed script via tsx
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:reset` - Reset database and re-run migrations + seed
## Platform Requirements
- Node.js (no minimum version strictly enforced)
- npm 5.2.0+ (for npm-workspace support if used)
- Local SQLite database file (`dev.db`)
- Vercel (designed for easy deployment per CLAUDE.md)
- SQLite database (local-first, can migrate to other databases later)
- Claude API key for AI features
- Storage for uploaded photos in `public/photos/` directory
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Component files: PascalCase (e.g., `GearForm.tsx`, `PhotoUpload.tsx`, `SpotMap.tsx`)
- API routes: lowercase with hyphens (e.g., `packing-list`, `vehicle/[id]/mods`)
- Utility/library files: camelCase (e.g., `claude.ts`, `weather.ts`, `exif.ts`)
- UI component barrel file: `index.ts` (exports all UI components with `export { default as ComponentName }`)
- Prefix helper functions with verb or descriptor (e.g., `getCategoryEmoji()`, `getCategoryLabel()`, `getConditionColor()`, `decodeWeatherCode()`, `celsiusToFahrenheit()`, `mmToInches()`)
- Handler functions: `handleEventName()` pattern (e.g., `handleSubmit()`, `handleEscape()`, `handleSave()`, `handleDelete()`, `handleFiles()`)
- Async functions: standard naming (e.g., `generatePackingList()`, `fetchLocations()`, `fetchVehicles()`)
- Utility functions: descriptive names without prefix (e.g., `createContext()`, `useTheme()`, `openEdit()`, `openAdd()`)
- State variables: camelCase (e.g., `uploading`, `editingItem`, `showWishlist`, `deleteError`)
- Boolean state: prefixed with is/show/has pattern (e.g., `isWishlist`, `showForm`, `showWishlist`, `isDeleting`, `dragOver`)
- Constants: CONSTANT_CASE for readonly values (e.g., `CATEGORIES`, `CONDITIONS`, `CATEGORY_EMOJIS`, `WMO_CODES`)
- Props objects: verbose naming (e.g., `initialItems`, `onUploadComplete`, `onSave`)
- Derived/computed variables: descriptive names (e.g., `filtered`, `grouped`, `ownedCount`, `wishlistCount`)
- Interfaces for component props: `ComponentNameProps` (e.g., `GearFormProps`, `ModalProps`, `PhotoUploadProps`)
- Data model interfaces: PascalCase singular (e.g., `GearItem`, `Location`, `PackingListResult`, `WeatherForecast`)
- Context type: `ContextNameValue` (e.g., `ThemeContextValue`)
## Code Style
- No Prettier config file — ESLint extended config determines formatting
- Indentation: 2 spaces
- Line length: no hard limit enforced
- Quotes: single quotes for JS/TS, backticks for template literals
- Semicolons: always present
- Tool: ESLint 9 with Next.js config extensions
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- ESLint disable comments: used for legitimate cases (e.g., `eslint-disable-next-line @typescript-eslint/no-explicit-any` in `SpotMap.tsx` for Leaflet type workaround)
## Import Organization
- `@/*` maps to root directory (configured in `tsconfig.json`)
- Used for: `@/lib/db`, `@/components/...`, `@/app/...`
- Relative imports still used for adjacent files (e.g., `import GearForm from './GearForm'`)
## Error Handling
- All routes wrapped in try-catch blocks
- Pattern: `try { ... } catch (error) { console.error('Action:', error); return NextResponse.json({ error: 'User-friendly message' }, { status: 500 }) }`
- Status codes used: 400 (validation), 404 (not found), 500 (server error), 201 (created)
- Validation: manual checks (e.g., `if (!body.name || !body.category) return ...`)
- Examples:
- State-based error messages (no `alert()`)
- Pattern: `setError(null)` on start, `setError('message')` on failure, render error state inline
- Async operations: use loading state (`setSaving`, `uploading`, `isDeleting`) + error state
- Examples:
- `await` used consistently for async operations
- `Promise.all()` used for parallel operations (e.g., `app/page.tsx` lines 5-25)
## Logging
- Server-side: always log errors in catch blocks with action context
- Client-side: no logging output
- Format: `console.error('Action description:', error)` — string describes what failed, error object follows
- Examples: `'Failed to fetch gear:'`, `'Failed to create location:'`, `'Failed to update gear item:'`
## Comments
- Explain non-obvious logic (e.g., `// Fix Leaflet default marker icon path issue with bundlers`)
- Document workarounds and their reasons
- JSDoc for utility functions (see `lib/weather.ts` line 1-5)
- Used for public utility modules (e.g., `weather.ts` opens with block comment explaining API docs link)
- Not used on individual functions (self-explanatory names preferred)
- Not used on React components (props interfaces document intent)
## Function Design
- Named parameters with type annotations
- Destructuring used for props: `({ initialItems }: { initialItems: GearItem[] })`
- Object params preferred over multiple args: `generatePackingList(params: { tripName, startDate, ... })`
- Explicit return types on all functions
- Async functions return Promises: `async function handler(): Promise<Type>`
- Handler functions often return `void` (state updates side effect)
- Null-coalescing common for serialization: `visitedAt?.toISOString() ?? null`
## Module Design
- Default export for single component/function per file
- Named exports for utilities (e.g., `export interface DayForecast { ... }`, `export async function generatePackingList(...)`)
- Barrel files: `components/ui/index.ts` re-exports all UI components
- Used only in `components/ui/` for cohesive UI component library
- Not used elsewhere — components import directly from their files
## React Patterns
- All components are functional with hooks
- Client components marked with `'use client'` directive
- `useState` for local component state
- `useCallback` for memoized event handlers and dependencies
- `useEffect` for side effects with explicit dependency arrays
- `useMemo` for expensive computations and filtered/grouped data
- `useContext` for context consumption
- `useRef` for DOM refs and imperative handles
- Always specified explicitly
- Minimal: only include values that effect depends on
- Example: `useCallback((e: KeyboardEvent) => { ... }, [onClose])` — depends on onClose callback
- Functional updates preferred when new state depends on old: handled through closures
- Props to state: pattern like `const [items, setItems] = useState<GearItem[]>(initialItems)`
## TypeScript
- Inline prop types: `function Component({ prop }: { prop: Type })`
- Extracted interfaces for complex props or reused types
- Record<K, V> for object lookups (e.g., `WMO_CODES: Record<number, { ... }>`)
- Null handling: explicit `| null` in types (e.g., `brand: string | null`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server Components as data gateways with Promise.all for parallel fetching
- Client Components handle all state, filtering, and modal interactions
- RESTful API routes with standardized error handling (try-catch + JSON responses)
- Prisma ORM for SQLite operations with proper relationship definitions
- Claude API integration for AI-powered features (packing list generation)
- Tailwind CSS styling with dark mode support via localStorage persistence
## Layers
- Purpose: Render pages and components; handle user interactions; manage local state
- Location: `app/*/page.tsx`, `components/*.tsx`
- Contains: Server pages (data fetching only), client components (state + UI)
- Depends on: API routes, lib utilities, Tailwind CSS
- Used by: Browser/Next.js runtime
- Purpose: RESTful endpoints for CRUD operations, imports, and AI features
- Location: `app/api/**/*.ts`
- Contains: Route handlers with request validation, database mutations, external service calls
- Depends on: Prisma client, external APIs (Claude, Weather), lib utilities
- Used by: Client components, browser fetch requests
- Purpose: Abstract database operations with relationship management
- Location: `lib/db.ts`, `prisma/schema.prisma`
- Contains: Prisma client instance, schema definitions (9 models)
- Depends on: SQLite database file, Prisma CLI
- Used by: All API routes
- Purpose: Interface with external services (Claude API, weather APIs)
- Location: `lib/claude.ts`, `lib/weather.ts`
- Contains: Service clients, API call wrappers, response parsing
- Depends on: Environment variables, npm packages (Anthropic SDK)
- Used by: API routes
## Data Flow
```
```
- **Local state:** useState for filtering, modals, form inputs (GearClient, TripsClient)
- **URL state:** None currently (could add query params for pagination/filters)
- **Database state:** Prisma mutations for persistence
- **Transient state:** Loading flags (isSaving, isDeleting) stored in React state
## Key Abstractions
- Purpose: Represents physical camping equipment with condition tracking
- Examples: `app/api/gear/route.ts`, `components/GearClient.tsx`
- Pattern: Full CRUD via REST API; client-side filtering; categorized display
- Purpose: Container linking start/end dates, location, vehicle, and packed items
- Examples: `app/api/trips/route.ts`, `components/TripsClient.tsx`
- Pattern: Packing items stored in junction table (PackingItem); supports multi-day events
- Purpose: Geographic point with camping metadata (cell signal, road condition, rating)
- Examples: `app/api/locations/route.ts`, `components/SpotMap.tsx`
- Pattern: References Photos; optional relationship to Trips; indexed by coordinates
- Purpose: Uploaded or imported image with EXIF/AI-inferred location
- Examples: `app/api/photos/route.ts`, `lib/exif.ts`
- Pattern: Coordinates can come from EXIF, Claude vision, or user; references Location & Trip
- Purpose: AI-generated checklist from gear inventory + weather + trip context
- Examples: `lib/claude.ts`, `components/PackingList.tsx`
- Pattern: Generated on-demand by Claude; persisted items tracked in PackingItem table
- Purpose: Google Maps timeline components (points, places, activities) for travel history
- Examples: `app/api/import/timeline/route.ts`, `prisma/schema.prisma`
- Pattern: Batch import with optional delete-before-insert; indexes on timestamp for querying
## Entry Points
- Location: `app/page.tsx` → `components/DashboardClient.tsx`
- Triggers: App load, navigation click
- Responsibilities: Show overview stats (gear count, locations, photos), display recent gear updates, summary totals (weight)
- Location: `app/gear/page.tsx` → `components/GearClient.tsx`
- Triggers: Navigation click, "Add/Edit Gear" action
- Responsibilities: Fetch all gear, render filtered/grouped list, modal for add/edit/delete, search and category filtering
- Location: `app/trips/page.tsx` → `components/TripsClient.tsx`
- Triggers: Navigation click, "Create Trip" action
- Responsibilities: List trips with date ranges, open trip detail modal, generate packing lists, manage trip metadata
- Location: `app/spots/page.tsx` → `components/SpotsClient.tsx` with Leaflet
- Triggers: Navigation click, marker click
- Responsibilities: Render interactive map with location markers and photo pins, show location details, create new location from map
- Location: `app/vehicle/page.tsx` → `components/VehicleClient.tsx`
- Triggers: Navigation click, "Add/Edit" action
- Responsibilities: Show vehicle specs, list mods/upgrades, add new mod entries, track cargo capacity and capabilities
## Error Handling
```typescript
```
```typescript
```
## Cross-Cutting Concerns
- Required fields checked before DB operations (e.g., name + category for gear)
- Returns 400 Bad Request if validation fails
- Client-side validation via input type=text/number constraints
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
