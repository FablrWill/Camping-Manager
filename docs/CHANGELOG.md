# Changelog

All notable changes to Outland OS are tracked here.

**Each session is its own file in `docs/changelog/`.** This prevents merge conflicts when parallel sessions update the changelog simultaneously.

## Session Index (newest first)

| Session | Date | Summary |
|---------|------|---------|
| [34](changelog/session-34.md) | 2026-04-04 | Phase 31: dark sky astro info, activities gear category, moon phase calculator, Bortle estimation, trip planner activity recommendations |
| [33](changelog/session-33.md) | 2026-04-04 | S15 Mac mini agent runner script, PATCH status support, PM2 config, GearForm stash recovery |
| [32](changelog/session-32.md) | 2026-04-04 | S14 Gear product research: Claude-powered alternatives comparison, research card in gear detail |
| [31](changelog/session-31.md) | 2026-04-04 | S13 Mac mini agent jobs infrastructure: AgentJob model, 3 API routes, dashboard badge, gear enrichment trigger |
| [30](changelog/session-30.md) | 2026-04-03 | UX review + execution plan: nav IA, prep stepper, component standards, 2-week sprint |
| [29](changelog/session-29.md) | 2026-04-03 | Mobile gear entry via AI (link/photo → auto-fill form) + iMessage-to-knowledge-base pipeline |
| [28](changelog/session-28.md) | 2026-04-03 | S01 photo bulk import: queue fix + verification (feature already shipped) |
| [27](changelog/session-27.md) | 2026-04-02 | Phase 14 execution — standalone build, photo path env, health endpoint, PM2 config, deploy script, backup/watchdog, Mac mini setup guide |
| [26](changelog/session-26.md) | 2026-04-02 | Phase 10 planning revision — incorporated cross-AI review feedback (concurrent tiles, debounce, AppShell sync, typed offlineData) |
| [25](changelog/session-25.md) | 2026-04-01 | Phase 08 execution complete — installable PWA, offline banner, "Leaving Now" trip caching, passive map tile caching |
| [24](changelog/session-24.md) | 2026-04-01 | Phase 07 execution complete — departure checklist, float plan email, settings page |
| [23](changelog/session-23.md) | 2026-04-01 | Phase 07 UI design contract — departure checklist, float plan, settings page |
| [22](changelog/session-22.md) | 2026-04-01 | Phase 06 gap closure execution — packing-list persistence, TripCard extraction, ConfirmDialogs |
| [21](changelog/session-21.md) | 2026-04-01 | Phase 06 full planning pipeline — discuss, research, UI-SPEC, plans, cross-AI review |
| [20](changelog/session-20.md) | 2026-04-01 | Project review + milestone v1.1 kickoff, 4 expert agent audits launched |
| [19](changelog/session-19.md) | 2026-04-01 | Phase 5 gap closure + verification, Milestone v1.0 complete, doc cleanup |
| [18](changelog/session-18.md) | 2026-03-31 | Phase 4: Chat Agent — streaming SSE, 11 tools, conversation persistence |
| [17](changelog/session-17.md) | 2026-03-31 | Phase 3 Knowledge Base execution — RAG corpus, hybrid search, PDF/web parsers |
| [16](changelog/session-16.md) | 2026-03-30 | Phase 3 planning complete + README, architecture, start-here docs |
| [15](changelog/session-15.md) | 2026-03-30 | Branch cleanup, merge all features, gear consolidation, doc audit |
| [14](changelog/session-14.md) | 2026-03-30 | Power Budget Calculator — planning + live mode |
| [13](changelog/session-13.md) | 2026-03-30 | Meal Planning — full implementation (AI generator, API route, UI component) |
| [12](changelog/session-12.md) | 2026-03-30 | Meal Planning Implementation Plan (planning session) |
| [11b](changelog/session-11b.md) | 2026-03-30 | Claude API Packing List Generator — first AI feature |
| [11a](changelog/session-11a.md) | 2026-03-30 | Seed Dev Database + Spots Dark Mode Polish |
| [10](changelog/session-10.md) | 2026-03-30 | Gear Data Recovery + Housekeeping |
| [9](changelog/session-09.md) | 2026-03-30 | Audit + Weather Integration + Smart Campsite |
| [8](changelog/session-08.md) | 2026-03-30 | Merge All Branches + App Rename to Outland OS |
| [7](changelog/session-07.md) | 2026-03-30 | User Journey + Roadmap Rewrite |
| [6b](changelog/session-06b.md) | 2026-03-30 | Project Review + Planning Pause |
| [6a](changelog/session-06a.md) | 2026-03-30 | Frontend Design System & Page Build-Out |
| [5b](changelog/session-05b.md) | 2026-03-30 | Knowledge Base Architecture + Corpus |
| [5a](changelog/session-05a.md) | 2026-03-30 | Location Pin Drop + Gear CRUD |
| [4](changelog/session-04.md) | 2026-03-30 | Interactive Timeline Map + Google Takeout Import |
| [3](changelog/session-03.md) | 2026-03-30 | Photo Map |
| [2](changelog/session-02.md) | 2026-03-29 | Foundation Build |
| [1](changelog/session-01.md) | 2026-03-29 | Project Kickoff |

## How It Works

- **One file per session** in `docs/changelog/` — e.g. `session-11.md`
- **Parallel sessions** use suffixes: `session-05a.md`, `session-05b.md`
- **No merge conflicts** — each session writes to its own file
- New sessions: create `session-NN.md` and add a row to the index table above
- This index is the only shared file — it's a one-line addition per session, easy to merge
