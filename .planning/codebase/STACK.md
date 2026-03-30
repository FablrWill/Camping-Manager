# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5 - Entire codebase (app, lib, API routes)
- JSX/TSX - React components and pages

**Secondary:**
- JavaScript - Configuration files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`)

## Runtime

**Environment:**
- Node.js (no specific version pinned in package.json)

**Package Manager:**
- npm (lockfile present: `package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack framework with App Router for mobile-first web app
- React 19.2.4 - UI component library

**Styling:**
- Tailwind CSS 4 (via `@tailwindcss/postcss`) - Utility-first CSS framework
- PostCSS 4 - CSS processing

**Database:**
- Prisma 6.19.2 - ORM for SQLite with migrations and seeding

**Mapping/UI:**
- Leaflet 1.9.4 - Interactive map library
- Leaflet.markercluster 1.5.3 - Map marker clustering
- Lucide React 1.7.0 - Icon library

## Key Dependencies

**Critical:**
- `@prisma/client` 6.19.2 - Database client, loads schema from `prisma/schema.prisma`
- `@anthropic-ai/sdk` 0.80.0 - Claude API integration for packing list generation (`lib/claude.ts`)
- `sharp` 0.34.5 - Image compression and EXIF rotation for photo uploads and imports
- `exif-parser` 0.1.12 - EXIF metadata extraction from photos for GPS coordinates

**Infrastructure:**
- `@types/node` 20, `@types/react` 19, `@types/react-dom` 19 - TypeScript type definitions
- `@types/leaflet` 1.9.21, `@types/leaflet.markercluster` 1.5.6 - Leaflet type definitions

## Configuration

**Environment:**
- Configured via `.env` file (see `.env.example` for required variables)
- `ANTHROPIC_API_KEY` - Required for AI features (packing list, meal planning)
- `DATABASE_URL` - Required, points to local SQLite: `file:./dev.db`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Optional, for future Google Maps integration

**Build:**
- `next.config.ts` - Next.js configuration (minimal, using defaults)
- `tsconfig.json` - TypeScript compiler settings with ES2017 target, strict mode, path alias `@/*`
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration using Next.js core-web-vitals and TypeScript rules

**Database:**
- `prisma/schema.prisma` - Data model (9 models: GearItem, Vehicle, VehicleMod, Location, Photo, Trip, PackingItem, TimelinePoint, PlaceVisit, ActivitySegment)
- `prisma/migrations/` - Sequenced migration files tracking schema evolution
- `prisma/seed.ts` - Seed script for initial data (invoked via `npm run db:seed`)

## Scripts

**Development:**
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Create/apply Prisma migrations
- `npm run db:seed` - Run seed script via tsx
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:reset` - Reset database and re-run migrations + seed

## Platform Requirements

**Development:**
- Node.js (no minimum version strictly enforced)
- npm 5.2.0+ (for npm-workspace support if used)
- Local SQLite database file (`dev.db`)

**Production:**
- Vercel (designed for easy deployment per CLAUDE.md)
- SQLite database (local-first, can migrate to other databases later)
- Claude API key for AI features
- Storage for uploaded photos in `public/photos/` directory

---

*Stack analysis: 2026-03-30*
