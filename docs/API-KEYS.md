# API Keys & External Services — Camp Commander

All keys go in `.env` (never committed to git). This doc tracks what we need and when.

## Current

| Service | Key Name | Status | Needed For | Phase |
|---------|----------|--------|------------|-------|
| Prisma/SQLite | `DATABASE_URL` | ✅ Set | Database connection | 1 |

## Planned

| Service | Key Name | Status | Needed For | Phase |
|---------|----------|--------|------------|-------|
| Google Maps | `GOOGLE_MAPS_API_KEY` | ❌ Not set up | Map view, location pins, route planning | 2 |
| Claude API | `ANTHROPIC_API_KEY` | ❌ Not set up | Gear ID, trip planning, Voice Ghostwriter, chat | 3 |
| Weather API | `WEATHER_API_KEY` | ❌ Not set up | Trip weather forecasts, solar estimates for power budget | 3 |
| Speech-to-Text | TBD | ❌ Not decided | Voice Ghostwriter input | 3 |
| Text-to-Speech | TBD | ❌ Not decided | Voice Ghostwriter agent responses | 3 |

## Possible Future

| Service | Key Name | Status | Needed For | Phase |
|---------|----------|--------|------------|-------|
| Recreation.gov | `RECREATION_GOV_API_KEY` | ❌ Not set up | Campsite search, permit availability | 3 |
| Neon/Supabase | `DATABASE_URL` (updated) | ❌ Not set up | Postgres when deploying to Vercel | 4 |
| Vercel | N/A (CLI auth) | ❌ Not set up | Deployment | 4 |

## How to Add a Key

1. Add the key to your `.env` file in the project root:
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   ```
2. Access it in code via `process.env.GOOGLE_MAPS_API_KEY`
3. For client-side keys (like Google Maps), prefix with `NEXT_PUBLIC_`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   ```

## Security Reminders
- `.env` is in `.gitignore` — it will never be pushed to GitHub
- Never paste API keys in code, docs, or chat
- `NEXT_PUBLIC_` keys are visible to users in the browser — only use for keys designed to be public (like Google Maps with domain restrictions)
- Server-only keys (Claude, weather) should NOT have the `NEXT_PUBLIC_` prefix
