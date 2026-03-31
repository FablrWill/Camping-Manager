# Start Here

Quick orientation for anyone (human or AI) opening this project for the first time.

## What This Is

Outland OS is a personal car camping second brain for one user (Will Sink, Asheville NC). It manages gear, plans trips, tracks camping spots, and uses Claude as an AI assistant. Mobile-first web app, not a commercial product.

## Read These First

1. **`CLAUDE.md`** — Project instructions, coding standards, conventions. Read this before writing any code.
2. **`TASKS.md`** — Single source of truth for what's built and what's next.
3. **`README.md`** — Tech stack, project structure, how to run it.

## Key Files by Area

### Pages
| URL | File | What it does |
|-----|------|-------------|
| `/` | `app/page.tsx` | Dashboard — stats, recent gear, trip countdown |
| `/gear` | `app/gear/page.tsx` | Gear inventory CRUD |
| `/trips` | `app/trips/page.tsx` | Trip list and planning |
| `/trips/[id]/prep` | `app/trips/[id]/prep/page.tsx` | Executive trip prep view |
| `/spots` | `app/spots/page.tsx` | Interactive map (Leaflet) |
| `/vehicle` | `app/vehicle/page.tsx` | Vehicle profile and mods |

### Core Files
| File | What it does |
|------|-------------|
| `prisma/schema.prisma` | Database schema — the domain model source of truth |
| `lib/db.ts` | Prisma client singleton |
| `lib/claude.ts` | Claude API integration (packing lists, meal plans) |
| `lib/weather.ts` | Open-Meteo weather fetching |
| `lib/power.ts` | Power budget calculations |
| `components/ui/index.ts` | Design system barrel export |

### Config
| File | What it does |
|------|-------------|
| `.env` | API keys and database URL (not in git) |
| `.env.example` | Template for required env vars |
| `prisma/seed.ts` | Dev seed data (33 gear items) |

## How the Code is Organized

**Server components** (`app/*/page.tsx`) fetch data from Prisma and pass it to **client components** (`components/*Client.tsx`) which handle all state and interactivity. **API routes** (`app/api/*/route.ts`) handle mutations and external service calls.

Every API route uses try-catch with `console.error` + JSON error responses. No `alert()` anywhere — errors are state-based inline messages.

## Design System

UI primitives live in `components/ui/`: Button, Card, Badge, Input, Modal, Chip, EmptyState, PageHeader, StatCard. Full specs in `docs/STYLE-GUIDE.md`. Dark mode supported via CSS custom properties.

## Planning System

This project uses the GSD workflow for planning and execution:

```
.planning/
  PROJECT.md          What this project is
  REQUIREMENTS.md     Acceptance criteria by phase
  ROADMAP.md          Phase breakdown and progress
  STATE.md            Current position and decisions
  phases/             Per-phase context, research, plans
  codebase/           Architecture and convention maps
```

## Naming

The canonical product name is **Outland OS**. Older references to "Camp Commander" or "Camping Manager" in code or docs refer to the same project. The `package.json` name field still says `camp-commander` — that's just the npm package name and doesn't affect anything.

## Running It

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Then open `localhost:3000`. Designed for mobile — use your phone or browser dev tools responsive mode.
