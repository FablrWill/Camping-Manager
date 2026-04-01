# Project Research Summary

**Project:** Outland OS — v1.1 Close the Loop
**Domain:** Personal camping second brain — PWA/offline, post-trip learning loop, trip execution
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

Outland OS v1.1 is an incremental milestone on a well-established foundation. The existing stack (Next.js 16, Prisma/SQLite, Claude API, Leaflet, Tailwind) needs only three new libraries: `zod` for runtime validation of Claude API responses, `nodemailer` for the safety float plan email, and `idb` for offline trip data snapshots. All four feature areas — PWA/offline, day-of execution, learning loop, and stabilization — integrate with the existing architecture without disrupting it. The recommended build order is: stabilize first (fix bugs + add Zod validation + persist AI outputs), then ship offline and day-of features in parallel, then close the loop with gear usage tracking and post-trip review.

The most important architectural decision in this milestone is how the "Leaving Now" offline snapshot works. The correct approach is IndexedDB (via `idb`) for trip data — not service worker response caching. Service worker caching is appropriate for the app shell and static assets; it is explicitly wrong for dynamic API data because stale responses silently replace fresh ones. The offline strategy is two-layer: service worker for the app shell, IndexedDB snapshot for trip content written at departure time. This is non-negotiable — the wrong approach requires a full rewrite to fix.

The biggest risk in this milestone is the learning loop data model. Post-trip feedback must be appended as events to a `TripFeedback` table, not written back to the source `GearItem` or `Location` records. Mutating source records destroys trip history, makes the feedback loop impossible to build, and has no undo path. The schema must be right before the debrief UI is built. A secondary risk is Serwist's hard dependency on Webpack — Next.js 16 defaults to Turbopack, so build scripts must be explicitly configured or the service worker silently doesn't generate. iOS storage clearing (7-day limit) is a real-world constraint that must be surfaced in the UI.

## Key Findings

### Recommended Stack

Three new libraries are all that's needed for v1.1. Everything else builds on the existing stack. The new libraries are minimal, well-established, and chosen to solve specific problems with the least surface area.

**New libraries for v1.1:**
- `zod` (4.3.6): Runtime validation for all Claude API responses — prevents crashes when Claude returns malformed JSON. Import from `"zod"` (not `"zod/v4"` — deprecated). Use `.safeParse()`, never `.parse()`, to preserve existing error handling.
- `nodemailer` (8.0.4): Safety float plan email via Gmail SMTP with App Password. Server-side API route only — credentials must never touch client code. Three new env vars: `EMAIL_FROM`, `EMAIL_APP_PASSWORD`, `EMAIL_EMERGENCY_CONTACT`.
- `idb` (8.0.3): IndexedDB wrapper for the "Leaving Now" offline snapshot. 1.19kB, authored by the IDB spec co-author, no abstraction overhead. Browser-only — guard with `typeof window !== 'undefined'`.

**Key config detail:**
Serwist requires Webpack. The `package.json` dev script must be `next dev` (without `--turbopack`) and the service worker must be disabled in dev mode. Alternative: skip Serwist entirely and write a manual `public/sw.js` (~80 lines) — avoids the Webpack/Turbopack dependency entirely and is sufficient for a single-user app.

**Unchanged from prior milestone research (no re-evaluation needed):**
`@serwist/next`, `leaflet.offline`, `react-speech-recognition`, `ai` + `@ai-sdk/anthropic`, `sqlite-vec`, `@anthropic-ai/sdk`

### Expected Features

**Must have (table stakes — v1.1 cannot ship without these):**
- Offline access to trip data (packing list, meal plan, saved spots) — app is useless at a campsite without signal
- PWA installable to home screen — manifest.json + icons + HTTPS
- API response validation (Zod on all Claude outputs) — production app cannot crash on malformed AI responses
- CRUD completeness — trip edit/delete, vehicle edit, mod edit/delete, photo delete — gaps break trust in the tool
- Persist packing list + meal plan to DB — prerequisite for both "Leaving Now" and gear usage tracking

**Should have (differentiators that make v1.1 worth building):**
- "Leaving Now" one-tap cache trigger — no camping app does this; coordinates weather snapshot, packing list, meal plan, spots, and emergency contact into one offline-ready bundle
- Trip Day Sequencer — dynamic departure checklist derived from actual trip data (not a static template); ADHD-friendly progressive disclosure (current step + next 2)
- Safety float plan email — sends trip summary to emergency contact at departure; fills a real gap in camping tools
- Gear usage tracking — mark items used/not-used post-trip; foundation for all future packing intelligence
- Post-trip auto-review summary — Claude generates 3-bullet debrief from usage data; zero typing required

**Defer (v2+):**
- Feedback-driven packing improvement — requires 3+ completed trips with usage data to be meaningful
- Dead man's switch check-in timer — requires persistent background job; local dev architecture doesn't support it reliably
- Full offline map tile pre-download — 100MB–2GB per region; Gaia GPS fills this adequately
- Dog-aware trip planning — waiting for dog to arrive and needs assessment

### Architecture Approach

All v1.1 features integrate as parallel additions to the existing Server Components → Client Components → REST API Routes → Prisma/SQLite architecture. No existing layers are replaced. The PWA offline layer (service worker + IndexedDB) sits between the browser and the network, transparent to everything below it. The learning loop is a post-trip state transition that writes to a new `TripFeedback` model (append-only) rather than mutating existing gear or location records.

**New components and their responsibilities:**
1. `public/sw.js` — Service worker; app shell with stale-while-revalidate; NetworkOnly for all `/api/*` routes; registered production-only
2. `app/manifest.ts` — Next.js built-in PWA manifest; zero dependencies
3. `lib/offline/useOnlineStatus.ts` — Hook exposing `navigator.onLine` with window event listeners
4. `lib/offline/tripCache.ts` — The only place that reads/writes IndexedDB trip snapshots; prevents scattered IDB calls
5. `components/OfflineBar.tsx` — Always-visible offline indicator when service worker is in offline mode
6. `app/api/trips/[id]/cache/route.ts` — Server-side data aggregator; assembles full trip snapshot JSON on "Leaving Now"
7. `app/api/trips/[id]/sequencer/route.ts` — Builds time-ordered departure checklist from packing + meals + gear battery status
8. `app/api/trips/[id]/safety-email/route.ts` — Formats and sends float plan via Nodemailer; credentials server-side only
9. `components/TripSequencer.tsx` — Departure checklist with progressive disclosure
10. `components/GearUsageTracker.tsx` — Post-trip used/unused/forgot checkboxes; batches to `/api/gear/usage`
11. `lib/parseClaudeJSON.ts` — Shared utility: JSON.parse + Zod safeParse in one call; all AI routes use this

**Schema additions (one Prisma migration, run early in Phase 2):**
- `PackingItem`: add `usedOnTrip Boolean?`, `forgotNeeded Boolean?`, `reviewedAt DateTime?`
- New `TripFeedback` model: append-only feedback events linked to trip, gear item, and location

**Build order (dependency graph):**
Block 1 (Stabilization) → Block 2 (Schema migration) → Block 3 (Day-Of) and Block 4 (PWA, parallel) → Block 5 (Learning Loop)

### Critical Pitfalls

1. **Serwist requires Webpack; Next.js 16 defaults to Turbopack** — Set `"dev": "next dev"` (remove `--turbopack`); set `disable: process.env.NODE_ENV === 'development'` in Serwist config. Service worker silently doesn't generate if this is wrong. Verify with DevTools > Application > Service Workers before assuming offline works.

2. **"Leaving Now" snapshot must use IndexedDB, not service worker response caching** — Service worker HTTP caching is volatile, subject to cache pressure, and iOS clears it after 7 days of inactivity. IndexedDB is the explicit user-triggered local store. Wrong approach = full rewrite to fix.

3. **Learning loop must append to `TripFeedback`, not mutate `GearItem`** — Mutating source records destroys trip history, makes the learning loop impossible to reconstruct, and has no undo path. Schema must be finalized before any debrief UI is written.

4. **Use `safeParse()`, not `parse()` for Zod validation** — `.parse()` throws a ZodError that the existing try-catch catches as a generic 500. Build the shared `parseClaudeJSON<T>` utility first; all AI routes use it. Return 422 for schema mismatches, not 500.

5. **Safety email credentials must live in server-side env vars only** — No `NEXT_PUBLIC_` prefix, no client component email logic. All email sending goes through the API route at `/api/trips/[id]/safety-email`.

## Implications for Roadmap

Research confirms a 5-block build order with clear dependency boundaries. Blocks 3 and 4 are independent of each other and can be built in parallel or either order after Block 1 completes.

### Phase 1: Stabilization

**Rationale:** Bugs and gaps in the existing system block every downstream feature. Packing list + meal plan persistence is required by "Leaving Now" AND gear usage tracking. Zod must precede any feature that caches Claude responses offline — malformed data cached offline is a broken app with no retry path. CRUD gaps destroy trust. Fix the floor before building upward.
**Delivers:** Reliable existing features; Zod validation on all Claude routes via shared `parseClaudeJSON<T>` utility; packing list + meal plan persisted to DB; complete CRUD coverage for trips, vehicle, mods, photos; design system consistency across forms.
**Addresses:** API validation (table stakes), CRUD completeness (table stakes), AI response reliability.
**Avoids:** Pitfall 5 (Zod `.parse()` breaking error handling), Pitfall 6 (null/undefined schema mismatch breaking existing clients).

### Phase 2: Schema Migration

**Rationale:** A single Prisma migration that adds `PackingItem` usage fields and the `TripFeedback` model unblocks both Phase 4 learning loop and future packing intelligence. Run it once, early, before any debrief code is written. SQLite ALTER TABLE limitations make migration order matter — nullable columns only on existing tables.
**Delivers:** `PackingItem.usedOnTrip`, `PackingItem.forgotNeeded`, `PackingItem.reviewedAt`; new `TripFeedback` append-only model.
**Avoids:** Pitfall 4 (mutating source records), Pitfall 11 (SQLite ALTER TABLE failures — all new columns nullable or with defaults).

### Phase 3: Day-Of Execution

**Rationale:** No offline dependency — these features work fully online and can be built and tested without a service worker. Trip Sequencer and safety email are independent routes that read from existing data. Ship these while PWA work runs in parallel.
**Delivers:** Trip Day Sequencer (time-ordered departure checklist); safety float plan email; "Send Float Plan" button integrated into the departure flow.
**Uses:** `nodemailer`, existing Claude API, existing Prisma models.
**Implements:** `/api/trips/[id]/sequencer`, `/api/trips/[id]/safety-email`, `TripSequencer` component.
**Avoids:** Pitfall 9 (email credentials in client code), Pitfall 8 (timezone handling — UTC storage + Intl.DateTimeFormat display from the start).

### Phase 4: PWA and Offline Mode

**Rationale:** The service worker and IndexedDB infrastructure is independent of the learning loop. Can be built in parallel with Phase 3 after Phase 1 completes. "Leaving Now" depends on packing list + meal plan persistence (Phase 1) but not on gear usage tracking (Phase 5).
**Delivers:** PWA installability (manifest + icons); app shell offline via service worker; "Leaving Now" cache trigger with IndexedDB snapshot; offline indicator bar; iOS 7-day limitation surfaced clearly in the UI.
**Uses:** `idb`, manual `public/sw.js` (recommended) or Serwist with explicit Webpack flag, `app/manifest.ts`.
**Implements:** `lib/offline/tripCache.ts`, `lib/offline/useOnlineStatus.ts`, `OfflineBar`, `/api/trips/[id]/cache`, "Leaving Now" button in `TripPrepClient`.
**Avoids:** Pitfall 1 (Serwist/Turbopack conflict), Pitfall 2 (API routes cached as stale), Pitfall 3 (SW cache instead of IndexedDB for snapshot), Pitfall 7 (iOS 7-day storage clearing — show snapshot age in UI).

### Phase 5: Learning Loop

**Rationale:** Depends on Phase 2 schema. Cannot be built without `TripFeedback` model and `PackingItem` usage fields in place. Voice debrief already exists — this phase wires it to write back to the new feedback model and surfaces the gear usage tracker as a post-trip review flow in `TripsClient`.
**Delivers:** Gear usage tracker (used/unused/forgot checkboxes); post-trip auto-review Claude summary (3 bullets); voice debrief writes back to gear notes and location ratings; packing list generator reads gear usage history as prompt context.
**Uses:** Existing Claude API, existing voice debrief infrastructure (`InsightsReviewSheet`, `voice/apply` route).
**Implements:** `GearUsageTracker`, `/api/gear/usage`, post-trip review state in `TripsClient`, `getGearUsageHistory()` query in `lib/claude.ts`.
**Avoids:** Pitfall 4 (learning loop mutating source records), Pitfall 10 (voice debrief iOS fallback — text input always present; voice as progressive enhancement only).

### Phase Ordering Rationale

- Phase 1 before everything: packing list persistence is a hard blocker for Phases 4 and 5; Zod utility is a hard blocker for offline caching of AI responses.
- Phase 2 immediately after Phase 1: schema migration is cheap and must precede all learning loop code. Running it early avoids conflicts with later data writes.
- Phases 3 and 4 are independent: neither depends on the other; both depend only on Phase 1 completion. Build in parallel or sequentially based on capacity.
- Phase 5 last: requires Phase 2 schema; benefits from Phase 4's "Leaving Now" trigger surfacing the post-trip review context; voice writeback is highest complexity and benefits from the stable foundation underneath it.

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Stabilization):** Pure bug fixes + Zod integration. safeParse pattern fully documented. No external integrations.
- **Phase 2 (Schema Migration):** Prisma migration mechanics well-understood. Nullable column rule for SQLite is known.
- **Phase 3 (Day-Of Execution):** Nodemailer Gmail SMTP is canonical and well-documented. Sequencer is pure data sorting logic over existing models.

Phases that benefit from a quick spike before implementation:
- **Phase 4 (PWA/Offline):** Validate the manual `public/sw.js` approach against Next.js App Router URL patterns before writing production SW code. 2-hour spike to confirm the manual SW correctly intercepts App Router routes before committing to the approach.
- **Phase 5 (Learning Loop — voice writeback):** The extraction schema (what fields Claude should identify and return from a voice debrief) needs a prompt engineering spike with a real audio sample before the UI is built.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All three new libraries verified via official npm, official docs, and multiple independent sources. Versions confirmed as of 2026-04-01. No experimental dependencies. |
| Features | HIGH | Feature list tightly scoped to the milestone. Dependency graph is explicit and cross-verified across all four research files. Table stakes / differentiators / v2+ deferral is well-reasoned. |
| Architecture | HIGH | Existing architecture is documented in CLAUDE.md. New additions are purely additive. PWA patterns verified against official Next.js docs (updated 2026-03-31). IndexedDB approach confirmed via multiple offline-first sources and the idb library author's own documentation. |
| Pitfalls | HIGH | All critical pitfalls verified against official docs, GitHub issues, and community reports. Serwist/Turbopack conflict, iOS 7-day storage, Zod parse vs safeParse, and SQLite ALTER TABLE limitations are confirmed real-world failure modes with documented examples and recovery paths. |

**Overall confidence:** HIGH

### Gaps to Address

- **Manual service worker vs. Serwist decision:** Research documents both paths and leans toward the manual approach as simpler for this app's needs. Validate with a 2-hour spike before Phase 4 to confirm the manual SW handles Next.js App Router URL patterns correctly. If it doesn't, fall back to Serwist with `--webpack` flag — well-documented fallback.
- **Voice debrief extraction schema:** The fields Claude should extract from a voice debrief (gear notes, location rating, trip notes) need to be defined and tested with a real audio sample before the `GearUsageTracker` and feedback write paths are built. Prompt engineering task, not architecture.
- **Feedback-driven packing improvement timing:** Deferred to v2+ but foundation is being built now. Reassess after Phase 5 ships and Will has 2-3 trips with usage tracking data. The feature may be ready earlier than expected.

## Sources

### Primary (HIGH confidence)
- [Next.js PWA Official Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — PWA manifest, service worker, Serwist patterns (updated 2026-03-31)
- [Zod v4 versioning docs](https://zod.dev/v4/versioning) — import path confirmation; `"zod"` root exports v4; `"zod/v4"` subpath deprecated
- [Zod 4.3.6 on npm](https://www.npmjs.com/package/zod) — version confirmed
- [nodemailer 8.0.4 on npm](https://www.npmjs.com/package/nodemailer) — version confirmed; v8 has bundled TypeScript types
- [idb 8.0.3 — Jake Archibald, GitHub](https://github.com/jakearchibald/idb) — MDN-referenced, IDB spec co-author
- [Serwist @serwist/next on npm](https://www.npmjs.com/package/@serwist/next) — Turbopack support issue confirmed
- [Workbox caching strategies (web.dev)](https://web.dev/learn/pwa/workbox) — NetworkOnly for API routes confirmed
- [Prisma Migrate limitations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues) — SQLite ALTER TABLE constraints confirmed
- [InfoQ: Zod v4 stable release](https://www.infoq.com/news/2025/08/zod-v4-available/) — August 2025 stable release confirmed

### Secondary (MEDIUM confidence)
- [LogRocket: Next.js 16 PWA offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — Serwist + idb approach confirmation
- [Next.js Offline-First discussion #82498](https://github.com/vercel/next.js/discussions/82498) — community patterns for App Router
- [Mailtrap Next.js email guide 2026](https://mailtrap.io/blog/nextjs-send-email/) — Gmail App Password SMTP pattern for personal-use apps
- [PWA iOS limitations 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — 7-day storage clearing confirmed
- [Zod safeParse vs parse — Codú](https://www.codu.co/niall/zod-parse-versus-safeparse-what-s-the-difference-7t_tjfne) — error handling behavior confirmed
- [Offline-First Frontend Apps 2025 — LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — IndexedDB vs Cache API decision patterns

### Tertiary (informational)
- Competitor feature analysis (Homebound, HikerAlert, Gaia GPS, RV Checklist app) — general patterns; no API access to verify specific behavior

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
