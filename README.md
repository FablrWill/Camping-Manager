# Outland OS

A personal car camping second brain — an AI-powered system that manages gear, plans trips, tracks spots, and uses Claude as a camping-expert agent. Built as a mobile-first web app for one user.

Previously known as Camp Commander / Camping Manager. **Outland OS** is the canonical name going forward.

## What It Does

- **Dashboard** — live stats, recent gear updates, upcoming trip countdown, quick actions
- **Gear inventory** — full CRUD with categories, search, condition tracking, wishlist, weight totals
- **Trip planning** — create trips with date ranges, destinations, weather forecasts, packing lists, meal plans, power budgets
- **Executive trip prep** — single "am I ready?" view composing weather + packing + meals + power status with traffic-light indicators
- **Interactive map** — Leaflet/OSM with location pins, photo pins, marker clustering, layer toggles, pin-drop location saving
- **Photo management** — upload with EXIF GPS extraction, auto-compress via Sharp, link to locations and trips
- **Vehicle profile** — specs, cargo dimensions, mods tracking for a 2025 Hyundai Santa Fe Hybrid
- **AI features** — Claude API packing list generator, meal planning with shopping lists, power budget calculator
- **Timeline** — Google Takeout import with GPS paths, place visits, activity segments, day picker

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma ORM (10 models) |
| Maps | Leaflet + OpenStreetMap |
| AI | Claude API (Anthropic SDK) |
| Weather | Open-Meteo (free, no API key) |
| Icons | Lucide React |
| Images | Sharp (compression + EXIF rotation) |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Initialize database
npm run db:migrate
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## Project Structure

```
app/                    Next.js pages + API routes
  page.tsx              Dashboard (home)
  gear/                 Gear inventory
  trips/                Trip planning + prep flow
  spots/                Interactive map
  vehicle/              Vehicle profile
  api/                  REST endpoints (gear, trips, locations, photos, weather, AI features)

components/             React client components (18 components)
  ui/                   Design system primitives (Button, Card, Badge, Modal, etc.)

lib/                    Utilities
  db.ts                 Prisma client singleton
  claude.ts             Claude API wrapper
  weather.ts            Open-Meteo integration
  power.ts              Power budget calculations
  exif.ts               EXIF metadata extraction

prisma/
  schema.prisma         Data model (10 models)
  migrations/           Schema evolution
  seed.ts               Dev seed data (33 gear items)

data/research/          NC camping knowledge corpus (7 curated files)
docs/                   Product docs, style guide, changelog
tools/photo-map/        Python scripts for Google Takeout extraction
```

## Database Models

GearItem, Vehicle, VehicleMod, Location, Photo, Trip, PackingItem, TimelinePoint, PlaceVisit, ActivitySegment

Schema: `prisma/schema.prisma`

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed dev data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset DB + re-migrate + re-seed |

## Key Docs

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` | Project instructions for AI coding assistants |
| `TASKS.md` | Single source of truth for what's built vs planned |
| `docs/STYLE-GUIDE.md` | Design system specs and component patterns |
| `docs/USER-JOURNEY.md` | North star UX definition |
| `docs/FEATURE-PHASES.md` | Feature build status by phase |
| `docs/start-here.md` | Quick orientation for new sessions |
| `docs/architecture-overview.md` | System architecture and data flow |

## Design

Mobile-first, dark mode supported. Design system uses CSS custom properties with Tailwind. UI primitives: Button, Card, Badge, Input, Modal, Chip, EmptyState, PageHeader, StatCard.

Style guide: `docs/STYLE-GUIDE.md`

## Context

- **Builder:** Will Sink — Asheville, NC
- **Vehicle:** 2025 Hyundai Santa Fe Hybrid
- **Single user** — no auth system
- **Learning project** — built with Claude Code to learn software development
- **Status:** Active development, 14+ sessions complete
