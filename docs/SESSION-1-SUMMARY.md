# Session 1 Summary — 2026-03-29

## What Happened
Will's first Claude Code session. He was sitting at a campsite near Asheville — his first-ever car camping trip — and decided to build a camping assistant app called Camp Commander. Dual purpose: learn Claude Code (same tooling his brother Jim uses for Fablr) and build something personally useful.

## The Genesis Spot
- **Location:** South rim of Linville Gorge, NC
- **Coordinates:** 35.8781400, -81.9092862
- **Date:** 2026-03-29
- **Scene:** Laptop on a camp table overlooking Hawksbill Mountain and the gorge. Bluebird day, early spring, bare trees. Bluetooth speaker, water bottle, EcoFlow + Starlink setup. Working from the Santa Fe.
- **Photos:** Will took 4 photos from the spot — save them to `00_Context/photos/genesis-spot/` when you get a chance.
- **Vibe:** "Today is the genesis of this project and it couldn't be more beautiful"

## Who Will Is
- 42, living in Asheville NC, co-founding Fablr.ai with brother Jim
- Strong ADHD — needs scannable content, bullets over paragraphs, no fluff
- Wants recommendations with reasoning, not options. "Go do it" mentality.
- Smart on AI/prompts but new to coding and terminal. Walk him through everything.
- See `00_Context/` for full background, voice/style guide, and working rules.

## What We're Building
A personal car camping assistant — hybrid conversational agent + traditional web app.

**Core modules:** Gear tracker, vehicle profile, trip planner, location journal, map & timeline, chat interface.

**Tech stack:** Next.js 16 + Tailwind + SQLite/Prisma + TypeScript. Deploy to Vercel eventually.

## Will's Setup
- **Vehicle:** 2022 Hyundai Santa Fe Hybrid (AWD, no roof rack yet)
- **Power:** EcoFlow Delta 2 + Starlink Mini for remote work
- **Camping style:** Solo (getting a dog soon), 1-4 night trips
- **Dev environment:** Mac, Node.js v23.11.0, Git, Python 3, Homebrew

## Key Decisions
- Mobile-friendly web app (not native)
- Google Maps for mapping
- Photos sourced from Google Photos
- No auth (single user, personal tool)
- Project moved from Google Drive to `/Users/willis/Camping Manager/` to avoid node_modules sync issues
- Claude handles most of the building; Will is learning as we go

## Feature Ideas Captured (docs/IDEAS.md)
1. **Voice Trip Debrief** — Talk to the agent on the drive home, it turns the conversation into a location entry + journal entry. Basically Fablr's insight applied to camping.
2. **Messenger-Style Chat** — Interact via a texting-style interface. Send photos of gear, screenshots of map locations, voice memos. Built-in chat first, possibly Telegram later.
3. **Trip Prep Mode** — Home screen asks "where are you going?" and "how many nights?" then generates a smart packing list from your gear inventory.

## Project Structure
```
/Users/willis/Camping Manager/
├── CLAUDE.md              — Project instructions for Claude Code
├── 00_Context/            — Will's personal context (about-me, voice, working rules)
├── docs/
│   ├── PLAN.md            — Full project plan, 4 phases, 6 modules
│   ├── STATUS.md          — Current status + next session pickup point
│   ├── CHANGELOG.md       — Running log of changes by session
│   ├── GOALS.md           — Project goals and success criteria
│   ├── IDEAS.md           — Feature idea parking lot
│   ├── vehicle-profile.md — Santa Fe specs, power setup, mods wishlist
│   └── SESSION-1-SUMMARY.md — This file
├── app/                   — Next.js pages (empty, ready for Phase 1)
├── components/            — React components (empty)
├── lib/                   — Utilities (empty)
├── prisma/                — Database schema (empty)
└── public/                — Static assets (empty)
```

## Where We Left Off
- **Phase:** 1 — Foundation
- **Next steps:**
  1. Scaffold the Next.js project (install dependencies, configure TypeScript + Tailwind)
  2. Set up Prisma with SQLite and define the database schema
  3. Build basic gear inventory CRUD
  4. Build vehicle profile page
  5. Mobile-responsive layout shell
- Will is going to share photos of his gear and his current campsite location as test data

## How to Start Next Session
```
cd ~/Camping\ Manager && claude
```
Read `docs/STATUS.md` first. Update STATUS.md, CHANGELOG.md, and GOALS.md at the end of every session.
