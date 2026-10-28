# Outland OS — Project Instructions

## What This Is
Outland OS: a personal car camping assistant built as a single-user, mobile-first Next.js + Prisma/SQLite PWA. Manages gear, trips, meal plans and shopping lists, spots on a map, photos, and an AI chat agent. Built by Will to run his own camping, and to learn Claude Code. Not a product for other users.

## Tech Stack
- **Framework:** Next.js 16.2.1 (App Router), React 19.2.4, TypeScript, mobile-first
- **Styling:** Tailwind CSS 4
- **Database:** SQLite via Prisma 6.19 (36 models in `prisma/schema.prisma`)
- **Maps:** Leaflet + OpenStreetMap (free, no API key needed)
- **Auth:** None (single user)
- **AI:** Claude API (`lib/claude.ts`, `lib/agent/`) for the chat agent and planning; Gemini (`lib/gemini.ts`) for the gear/meal/memory/alert calls
- **Tests:** Vitest (`tests/`, `lib/__tests__/`, `components/__tests__/`)
- **Hosting:** Production runs on the Mac Mini (ssh alias `lisa-mini`) under pm2. The MacBook is development only.

## Project Structure
```
/app              — Next.js App Router pages + API routes
  /api/*          — gear, trips, locations, photos, meal-plan, packing-list, agent, health, status, …
  /status         — quota/status dashboard
  /chat /gear /trips /spots /vehicle /inbox /settings /share
/components       — React components (73 feature components + 11 UI primitives in /ui)
/lib              — db client, claude.ts, gemini.ts, agent/, rag/, voice/, weather, power, exif, …
/prisma           — schema (36 models), migrations, seed.ts
/scripts          — agent-runner.ts (pm2 app `outland-agent`), deploy.sh, backup/watchdog, scheduler
/automation       — LisaBrain bridge: remember_camping.py, launchd plist, MINI-RUNBOOK-camping-to-lisa.md
/tests            — Vitest suites
/public           — Static assets, service worker (sw.js)
/tools            — photo-map (Google Takeout extraction + AI enrichment), ingest
/docs             — Project docs, changelog, plans; dated reviews in docs/archive/
/.planning        — GSD planning: milestones, phases, codebase/ (stack, conventions, architecture)
/00_Context       — Personal context files (voice, style, working rules)
```

## Commands
```bash
npm run dev          # next dev
npm run build        # next build (standalone output)
npm run lint         # eslint
npm test             # vitest run
npm run test:watch   # vitest
npm run db:migrate   # prisma migrate dev   — MacBook only
npm run db:seed      # prisma db seed (prisma/seed.ts)
npm run db:studio    # prisma studio
npm run db:reset     # prisma migrate reset — MacBook only, NEVER on the Mini
```

## Development Workflow
- Claude Code writes and changes the code; Will runs the app and validates in Chrome (UI, console, network)
- After a change, expect Will to report back with screenshots, errors, or console output. Don't ask "did it work?"

## Coding Standards
- TypeScript throughout; functional components with hooks
- Keep it simple — this is a personal tool, not enterprise software. No premature abstractions.
- Commit messages: imperative mood, concise
- All API routes must have try-catch error handling with console.error + JSON error response
- No `alert()` in components — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays — never include state that the hook itself updates
- Every page that queries the database must have `export const dynamic = 'force-dynamic'`. Without it, Next.js renders the page at build time and serves stale HTML forever.

## Documentation Standards
- **TASKS.md** is the single source of truth. Update it every session.
- **Changelog** is one file per session in `docs/changelog/` (`session-NN.md`, parallel sessions use suffixes like `session-05a.md`)
  - Each session creates its own file — **never edit another session's file**
  - `docs/CHANGELOG.md` is just an index table. Add one row when you create a session file; pick the next unused number from it.
- **docs/STATUS.md** must match the latest session number
- When a feature listed in TASKS.md or FEATURE-PHASES.md is built, mark it ✅ Done immediately — don't leave stale "Ready" markers

## Production — CRITICAL RULES

**The Mac Mini is production. The MacBook is development only.**

| Environment | Machine | Database | Contains |
|-------------|---------|----------|----------|
| Production | Mac Mini (`lisa-mini`) | `~/outland-data/db.sqlite` | Will's real gear, trips, locations, photos |
| Development | MacBook | `prisma/dev.db` | Seed data only — safe to wipe |

pm2 runs two apps from `ecosystem.config.js`: `outland` (the standalone Next.js server on port 3000) and `outland-agent` (`scripts/agent-runner.ts`). Data, photos, backups and logs live in `~/outland-data` on the Mini.

1. **NEVER run `npm run db:reset`, `prisma migrate dev`, or `prisma db push` on the Mini.** Reset drops all of Will's data with no undo; `db push` can silently drop columns or tables.
2. **Always back up before any migration on the Mini:**
   ```bash
   ssh lisa-mini 'cp ~/outland-data/db.sqlite ~/outland-data/backups/db-pre-migration-$(date +%Y%m%d).sqlite'
   ```
3. **Schema changes:** develop and test with `prisma migrate dev` on the MacBook, commit the migration files, then on the Mini apply with `prisma migrate deploy` only (via the deploy script).
4. MacBook Claude Code sessions **may** SSH into `lisa-mini` to deploy and restart the app, but must **never run a destructive database command** over that connection. When in doubt, run the backup first.

### Deploying
- Deploy on the Mini with `cd ~/outland && ./deploy.sh` (documented in `docs/MAC-MINI-SETUP.md`). `scripts/deploy.sh` is a second variant that also restarts `outland-agent`.
- Both scripts: pull, install, `prisma migrate deploy`, build, copy `public` and `.next/static` into `.next/standalone`, symlink photos to `~/outland-data/photos`, restart pm2. Never bypass them with manual commands unless you know exactly what you're doing.
- Root `deploy.sh` uses `git pull --ff-only`, so it fails (and the old version keeps running) if the Mini's checkout has diverged.
- Manual build on the Mini: after `npm run build`, run `cp -r .next/static .next/standalone/.next/static` and `cp -r public .next/standalone/public`.

### Environment
- The running app reads `~/outland/.next/standalone/.env`, NOT `~/outland/.env`. Neither deploy script copies `.env`. If you update API keys or env vars, update **both** files and restart pm2.
- `DATABASE_URL` is set explicitly in `ecosystem.config.js` `env_production` because another project on the Mini sets a Postgres `DATABASE_URL` in the login shell. Do not remove it.

### LisaBrain bridge
`automation/remember_camping.py` reads new `TripFeedback` rows from the production DB (read-only) and stores each post-trip debrief in LisaBrain as `source='camping'`, run hourly by `automation/launchd/com.lisaos.camping-capture.plist`. Deployment steps are in `automation/MINI-RUNBOOK-camping-to-lisa.md`.

## Status
No commits since 2026-06-22. Milestone v5.0 "Field Ready": phases 58 (security hardening) and 60 (photo backup) are Ready but not started; phases 61/62 (first field trip, post-trip feedback) are unrecorded in TASKS.md.
