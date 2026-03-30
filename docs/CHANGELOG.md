# Changelog

All notable changes to Outland OS are tracked here.

**Each session is its own file in `docs/changelog/`.** This prevents merge conflicts when parallel sessions update the changelog simultaneously.

## Session Index (newest first)

| Session | Date | Summary |
|---------|------|---------|
| [14](changelog/session-14.md) | 2026-03-30 | Power Budget Calculator — planning + live mode |
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
