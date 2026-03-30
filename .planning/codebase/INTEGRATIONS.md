# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**AI/LLM:**
- Claude API (Anthropic) - Packing list generation, meal planning, conversational features
  - SDK: `@anthropic-ai/sdk` 0.80.0
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Client: `lib/claude.ts` instantiates `Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
  - Model: `claude-sonnet-4-20250514` for packing list generation

**Weather:**
- Open-Meteo API - Free weather forecasts (no API key required)
  - Endpoint: `https://api.open-meteo.com/v1/forecast`
  - Client: `lib/weather.ts`
  - Usage: Fetches daily forecasts (temperature, precipitation, wind, UV index) to inform packing list generation
  - Format: Returns WMO weather codes, temperature in Celsius (converted to F), precipitation in mm (converted to inches), wind in kph (converted to mph)
  - Caching: API responses cached for 1 hour with stale-while-revalidate for 30 minutes (header in `app/api/weather/route.ts`)

**Maps (Optional/Planned):**
- Google Maps API - Planned for Routes API and Places search
  - Auth: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable (optional, not currently implemented)

## Data Storage

**Databases:**
- SQLite (local-first, file-based)
  - Connection: `DATABASE_URL="file:./dev.db"`
  - Client: Prisma ORM via `@prisma/client` 6.19.2
  - Location: `prisma/schema.prisma` defines 9 models
  - Database file location: `dev.db` in project root (created during first migration)

**File Storage:**
- Local filesystem only - Photo uploads stored in `public/photos/`
  - Upload endpoint: `app/api/photos/upload/route.ts`
  - Compression: sharp library resizes to 1200x1200px max, JPEG quality 75
  - Naming: UUID.jpg format (e.g., `550e8400-e29b-41d4-a716-446655440000.jpg`)
  - Import source: Photos can be imported from Google Takeout via `app/api/import/photos/route.ts`

**Caching:**
- None (uses HTTP cache headers for external API responses)

## Authentication & Identity

**Auth Provider:**
- None - Single-user application (no user management or login)
- All API routes accessible without authentication

## Monitoring & Observability

**Error Tracking:**
- None configured - Errors logged to console via `console.error()`

**Logs:**
- Console logging (stderr) in API routes:
  - `app/api/weather/route.ts` - Weather API errors
  - `app/api/packing-list/route.ts` - Packing list generation failures, weather fetch failures
  - `app/api/photos/upload/route.ts` - Per-file upload errors
  - `app/api/import/photos/route.ts` - Photo import errors
  - `app/api/import/timeline/route.ts` - Timeline import errors
  - `lib/weather.ts` - Open-Meteo API response validation

## CI/CD & Deployment

**Hosting:**
- Vercel (configured as primary deployment target per CLAUDE.md)

**CI Pipeline:**
- None currently (linting runs locally via `npm run lint`)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - SQLite database connection string (default: `file:./dev.db`)
- `ANTHROPIC_API_KEY` - Claude API key (required for packing list generation)

**Optional env vars:**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key (for future routes/places features)
- `NODE_ENV` - Set by Next.js (used to manage Prisma singleton in `lib/db.ts`)

**Secrets location:**
- `.env` file (local development, NOT committed to git)
- `.env.example` documents required and optional variables
- Production secrets managed by Vercel environment variables

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- None configured

## Data Import/Export

**Google Takeout Import:**
- Photos: `app/api/import/photos/route.ts` accepts JSON metadata + filesystem paths from Google Takeout exports
  - Accepts: title, lat/lon, altitude, timestamp, image path, Google Photos URL, vision-inferred location details
  - Processing: Compresses images via sharp, extracts GPS, saves to `public/photos/`

- Location Timeline: `app/api/import/timeline/route.ts` accepts Google Maps Timeline data (JSON)
  - Accepts: Timeline points (lat/lon/timestamp), place visits (name/address/duration), activity segments (hiking/driving/etc.)
  - Processing: Batch imports (500 records per transaction) into TimelinePoint, PlaceVisit, ActivitySegment tables

## Photo Processing

**EXIF Extraction:**
- Library: `exif-parser` 0.1.12
- Usage: `lib/exif.ts` extracts GPS coordinates, altitude, and timestamp from uploaded photos
- Applied in: `app/api/photos/upload/route.ts` - required for photo placement on map

**Image Compression:**
- Library: `sharp` 0.34.5
- Applied in: `app/api/photos/upload/route.ts` and `app/api/import/photos/route.ts`
- Format: JPEG
- Compression: Max 1200x1200px, quality 75, auto-rotated based on EXIF orientation
- Purpose: Reduce file size, normalize orientation for display

## Rate Limiting

- None configured (single-user local app)

---

*Integration audit: 2026-03-30*
