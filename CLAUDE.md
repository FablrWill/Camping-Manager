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
- **CHANGELOG.md** rules:
  - Newest session first (reverse chronological)
  - One entry per session — never duplicate a session
  - Parallel sessions on the same day get suffixes: "Session 5a", "Session 5b"
  - Always include a `---` separator between sessions
  - Mark status changes in FEATURE-PHASES.md and TASKS.md when features are completed
- **STATUS.md** must match CHANGELOG.md session numbering exactly
- When a feature listed in TASKS.md or FEATURE-PHASES.md is built, mark it ✅ Done immediately — don't leave stale "Ready" markers
