---
phase: quick
plan: 260404-jo3
subsystem: trip-intelligence
tags: [ai, settings, prisma, claude]
dependency_graph:
  requires: [lib/claude.ts, lib/parse-claude.ts, lib/db.ts, prisma/schema.prisma]
  provides: [CampingProfile singleton, /api/trips/intelligence, TripIntelligenceCard]
  affects: [components/SettingsClient.tsx]
tech_stack:
  added: []
  patterns: [singleton-model, haversine-distance, claude-sonnet-4-6, zod-parseClaudeJSON]
key_files:
  created:
    - lib/trip-intelligence.ts
    - app/api/trips/intelligence/route.ts
    - components/TripIntelligenceCard.tsx
    - prisma/migrations/20260404181334_add_camping_profile/migration.sql
  modified:
    - prisma/schema.prisma
    - lib/parse-claude.ts
    - components/SettingsClient.tsx
decisions:
  - CampingProfile migration applied via better-sqlite3 direct execution — FTS triggers in existing migrations block prisma migrate dev shadow DB (same pattern as Phase 34)
  - date-fns not installed; implemented differenceInDays locally as a pure function to avoid adding a dependency
  - Stats (tripCount, avgNights, totalNights, topSeason, avgDriveMiles) computed locally from DB query — Claude only produces patterns/gearInsights/spotsToRevisit; avoids hallucinated numbers
metrics:
  duration: 262s
  completed: 2026-04-04
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase quick Plan 260404-jo3: Trip Intelligence Report Summary

**One-liner:** On-demand camping report card using Claude claude-sonnet-4-6 to analyze full trip history, cached as CampingProfile singleton in SQLite, surfaced in Settings page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema + Library + API routes | d891645 | schema.prisma, trip-intelligence.ts, parse-claude.ts, intelligence/route.ts, migration.sql |
| 2 | UI card + Settings integration | 1b6e02f | TripIntelligenceCard.tsx, SettingsClient.tsx |

## What Was Built

### CampingProfile Model (`prisma/schema.prisma`)
Singleton model with `id @default("singleton")` following the Settings model pattern. Stores `reportJson` (full TripIntelligenceReport as JSON string) and `generatedAt` timestamp.

### Trip Intelligence Library (`lib/trip-intelligence.ts`)
- Queries all trips with location, packingItems+gear, tripFeedbacks, mealPlan includes
- Computes stats locally: tripCount, avgNights (1 decimal), totalNights, topSeason (season count from startDate month), avgDriveMiles (haversine from Asheville 35.5951, -82.5515)
- Builds a plain-text data summary and calls Claude claude-sonnet-4-6 for patterns, gearInsights, spotsToRevisit
- Merges local stats with Claude output into TripIntelligenceReport
- Uses `parseClaudeJSON` with `TripIntelligenceReportSchema` — falls back to empty arrays if parse fails

### Parse Schema Addition (`lib/parse-claude.ts`)
Added `TripIntelligenceReportSchema` (patterns: string[], gearInsights: {name, insight, action enum}, spotsToRevisit: {name, reason}) and exported `TripIntelligenceClaudeData` type.

### API Routes (`app/api/trips/intelligence/route.ts`)
- **GET**: Returns cached report from CampingProfile singleton or `{ report: null }` if none exists
- **POST**: Checks trip count (< 3 → 400 with user-friendly message), calls generateTripIntelligence(), upserts singleton, returns report

### TripIntelligenceCard Component (`components/TripIntelligenceCard.tsx`)
- Fetches GET on mount (shows skeleton while loading)
- Empty state with "Generate Profile" button when no report cached
- Report view: stat badge pills, Patterns section, Gear Insights with action badges (green/amber/blue), Spots to Revisit
- Footer with relative timestamp ("Last updated: Xm ago") + Refresh button
- Inline error display for both generate and refresh failures

### SettingsClient Integration
TripIntelligenceCard added after Email Configuration card, before closing div.

## Deviations from Plan

**[Rule 3 - Blocking] date-fns not installed**
- Found during: Task 1
- Issue: `import { differenceInDays } from 'date-fns'` caused TS2307 — date-fns not in node_modules
- Fix: Implemented `differenceInDays(end, start)` locally as a 3-line pure function using Date.getTime() math
- Files modified: lib/trip-intelligence.ts
- Commit: d891645 (in-flight fix, same commit)

**[Rule 3 - Blocking] db.ts uses named export not default export**
- Found during: Task 1
- Issue: `import prisma from '@/lib/db'` failed — lib/db.ts uses `export const prisma = ...`
- Fix: Changed to `import { prisma } from '@/lib/db'` in both new files
- Files modified: lib/trip-intelligence.ts, app/api/trips/intelligence/route.ts
- Commit: d891645 (in-flight fix, same commit)

**[Rule 3 - Blocking] prisma migrate dev blocked by FTS trigger conflict**
- Found during: Task 1 (migration application)
- Issue: Same P3006 shadow DB error as Phase 34 — existing FTS migrations have duplicate column issues in shadow DB
- Fix: Created migration directory manually, wrote migration.sql, applied via better-sqlite3 and inserted _prisma_migrations record directly
- Commit: d891645

## Known Stubs

None — all data paths are wired. The report renders real data from the DB when generated.

## Self-Check: PASSED

- lib/trip-intelligence.ts: FOUND
- app/api/trips/intelligence/route.ts: FOUND
- components/TripIntelligenceCard.tsx: FOUND
- prisma/migrations/20260404181334_add_camping_profile/migration.sql: FOUND
- Commit d891645: FOUND
- Commit 1b6e02f: FOUND
