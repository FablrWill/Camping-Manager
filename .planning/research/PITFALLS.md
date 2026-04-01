# Pitfalls Research

**Domain:** Adding PWA/offline mode, post-trip learning loop, trip day execution, and Zod stabilization to existing Next.js 16 + Prisma + SQLite camping app
**Researched:** 2026-04-01
**Confidence:** HIGH — all critical pitfalls verified against official docs and community reports

---

## Critical Pitfalls

Mistakes that cause rewrites, runaway costs, or deployment blockers.

---

### Pitfall 1: Serwist Requires Webpack; Next.js 16 Defaults to Turbopack

**What goes wrong:**
Next.js 16 ships with Turbopack as the default bundler (enabled in `next dev` and `next build`). Serwist (`@serwist/next`) — the only maintained App Router PWA library — requires Webpack for service worker compilation. If you add Serwist without adjusting your build scripts, the service worker file never gets generated, the PWA manifest is never injected, and offline mode silently doesn't work. Turbopack support exists in `@serwist/turbopack` (v9+) but is newer and less battle-tested.

**Why it happens:**
The Turbopack migration in Next.js 16 is transparent for most features. Developers add Serwist, see no compile errors, and assume it's working — until they go offline and the app fails.

**Consequences:**
Service worker is never registered. Offline mode doesn't exist despite appearing to. "Leaving Now" cache trigger does nothing.

**Warning signs:**
- `navigator.serviceWorker.register()` returns a 404 for `/sw.js`
- No service worker listed in Chrome DevTools > Application > Service Workers
- PWA install prompt never appears

**How to avoid:**
Use `@serwist/next` v9+ with explicit build configuration. Either:
1. Pin `next dev --webpack` and `next build` to stay on Webpack (simpler, stable)
2. Or use `@serwist/turbopack` if Turbopack dev speed matters

Add to `package.json`:
```json
"dev": "next dev --webpack",
"build": "next build"
```
And set `disable: process.env.NODE_ENV === 'development'` in `withSerwistInit` config to prevent service worker from interfering with dev.

**Phase to address:** PWA Offline phase — before writing any service worker logic.

---

### Pitfall 2: Service Worker Caches Next.js API Routes as Stale Responses

**What goes wrong:**
If the service worker uses a `stale-while-revalidate` or `cache-first` strategy across all routes, it will cache `/api/gear`, `/api/trips`, and other API routes. After the initial cache, subsequent fetches return stale responses even when the user is online. The user edits a gear item, navigates away, comes back, and sees the old value — because the service worker served the cached API response.

**Why it happens:**
Generic Workbox/Serwist configurations treat all same-origin requests identically. The default `defaultCache` in Serwist includes API routes unless explicitly excluded. Developers copy default configs without reading which URL patterns are covered.

**Consequences:**
Mutations appear to succeed (the database write happens) but the UI shows stale data until cache expires or user force-refreshes. This is subtle and hard to reproduce.

**Warning signs:**
- Edit a record, navigate away, come back — old data shows
- DevTools Network tab shows API responses served "from ServiceWorker"
- Only reproduced in PWA mode (installed on home screen), not browser tab

**How to avoid:**
Explicitly exclude all `/api/` routes from service worker caching. Use `NetworkOnly` for any URL matching `/api/*`. Only cache static assets (`/_next/static/`, images) and the app shell (HTML pages). The offline strategy for data is IndexedDB snapshots, not service worker response caching.

```typescript
// In sw.ts — explicit exclusion
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);
```

**Phase to address:** PWA Offline phase — configure routing rules before any offline data work.

---

### Pitfall 3: "Leaving Now" Snapshot Must Copy Data to IndexedDB, Not Rely on Service Worker Cache

**What goes wrong:**
The intuitive approach to "Leaving Now" caching is to pre-fetch all trip-related API routes so the service worker caches the responses. This works for one session but breaks when the data changes. If the user updates their packing list after clicking "Leaving Now," the service worker has the old response cached and serves it offline. Worse, if the service worker cache is invalidated (browser update, cache clearing), all offline data disappears.

**Why it happens:**
Service worker response caching feels like "offline storage" but it's really "HTTP response caching." It's not designed for explicit user-triggered snapshots with guaranteed retention.

**Consequences:**
Offline trip data is stale, incomplete, or silently missing. The feature appears to work until the user actually needs it in the field.

**Warning signs:**
- Data appears offline but doesn't match what was shown before departure
- Offline data disappears after browser update or cache pressure
- iOS PWA storage cleared after 7 days of inactivity (iOS clears PWA storage aggressively)

**How to avoid:**
Use IndexedDB for the "Leaving Now" snapshot, not service worker cache:
1. On "Leaving Now" trigger: fetch all trip data from the API and write it to IndexedDB (using `idb` library)
2. Service worker intercepts `/api/*` requests while offline and reads from IndexedDB — it does not cache the API responses itself
3. This is an explicit copy-to-local-storage pattern, not automatic HTTP caching

iOS caveat: IndexedDB on iOS is also subject to 7-day storage clearing if the PWA is not used. This is a hard platform limitation — document it, and add a "Refresh offline data" button.

**Phase to address:** PWA Offline phase — core architecture decision; wrong approach requires full rewrite.

---

### Pitfall 4: Learning Loop Overwrites Original Data Instead of Recording Feedback Separately

**What goes wrong:**
Post-trip debrief writes changes directly to gear records, packing lists, and location ratings — mutating the source of truth. The `GearItem.notes` field gets overwritten with post-trip observations, replacing the pre-trip notes. A packing list gets regenerated with post-trip feedback baked in, so there's no record of what the original recommendation was. After 3 trips, the history is gone and the system can't explain why it's making certain recommendations.

**Why it happens:**
Mutations are simpler to model than append-only feedback. "Update gear notes with trip observations" is one line of code. Building a separate feedback table feels like over-engineering for a personal app.

**Consequences:**
- No trip history to learn from — each trip overwrites the previous feedback
- Cannot distinguish "always bring this" from "needed it once in unusual conditions"
- Bugs in the debrief flow silently corrupt gear records

**How to avoid:**
Model feedback as events, not mutations:

Add a `TripFeedback` table:
```prisma
model TripFeedback {
  id          Int      @id @default(autoincrement())
  tripId      Int
  gearItemId  Int?
  locationId  Int?
  type        String   // "used", "unused", "forgot_needed", "gear_note", "location_rating"
  value       String?
  createdAt   DateTime @default(now())
}
```

The packing list generator reads historical feedback as context (not as mutations to the gear records). Location ratings are averaged from feedback events, not overwritten. Gear notes accumulate in `TripFeedback`, and the AI synthesizes them on demand.

**Phase to address:** Learning Loop phase — data model must be right before building the debrief UI.

---

### Pitfall 5: Zod Added to Claude API Responses Using `.parse()` Throws and Breaks Existing Error Handling

**What goes wrong:**
The existing API routes in this codebase use try-catch with `NextResponse.json({ error: '...' }, { status: 500 })` for error handling. If Zod validation is added using `.parse()` (which throws a `ZodError` on failure), the ZodError is caught by the outer try-catch but the error message is a Zod internal object, not a user-friendly string. Worse, the 500 response is returned instead of a 400 (validation failure vs. server error), confusing error monitoring.

**Why it happens:**
`.parse()` is the default Zod example in docs. Developers add it inside existing try-catch blocks without realizing `.parse()` throws a different error type than they're handling.

**Consequences:**
Validation errors look like server crashes. The API returns 500 for bad Claude output instead of surfacing the real issue. Debugging is harder because the ZodError is swallowed.

**How to avoid:**
Use `.safeParse()` universally for Claude API response validation:

```typescript
const result = PackingListSchema.safeParse(parsed);
if (!result.success) {
  console.error('Claude response schema mismatch:', result.error.issues);
  return NextResponse.json(
    { error: 'AI response format unexpected', raw: text },
    { status: 422 }
  );
}
return NextResponse.json(result.data);
```

Build a shared `parseClaudeJSON<T>(text: string, schema: ZodSchema<T>)` utility in `lib/claude.ts` that handles JSON.parse + Zod safeParse in one call. All Claude API routes use this instead of naked `JSON.parse()`.

**Phase to address:** Stabilization phase — fix before adding new AI features.

---

### Pitfall 6: Zod Schema Added to Existing API Inputs Breaks Clients That Send Optional Fields as Null vs. Undefined

**What goes wrong:**
Existing API routes accept loose JSON bodies. Adding Zod input validation with `.parse()` will reject previously-valid requests if the schema is stricter than what clients actually send. A gear item form might send `{ brand: null }` but the Zod schema uses `z.string().optional()` which expects `undefined`, not `null`. All existing clients break with 400 errors after validation is added.

**Why it happens:**
TypeScript types and Zod schemas use `undefined` for optional fields, but JSON serialization turns `undefined` into omission and `null` stays `null`. The mismatch is invisible until runtime.

**Consequences:**
Adding Zod to an existing API route immediately breaks the UI if the schema doesn't match what the existing client sends. This is a silent regression — forms stop working after "adding validation."

**How to avoid:**
Use `.nullable()` generously when adding Zod to existing endpoints:
```typescript
z.object({
  brand: z.string().nullable().optional(), // accepts null, undefined, or string
})
```
Or use `.preprocess()` to coerce null to undefined for optional string fields. Audit the actual request bodies being sent (check browser DevTools network tab) before writing the schema.

Also: add Zod as `safeParse` with logging only first (no rejection), verify it passes on real traffic, then switch to enforcement.

**Phase to address:** Stabilization phase — test schemas against real client payloads before enforcing.

---

## Moderate Pitfalls

---

### Pitfall 7: iOS PWA Storage Cleared Aggressively — Offline Data Disappears

**What goes wrong:**
iOS has a 7-day cap on script-writable storage (IndexedDB, Cache Storage) for PWAs. If the app isn't actively used for 7 days, iOS clears all stored data — including the "Leaving Now" offline snapshot. A user who prepares their offline data on Thursday and leaves for a camping trip the following Friday arrives with an empty offline cache.

**Why it happens:**
Apple's Intelligent Tracking Prevention and storage management policies treat PWA data as non-essential. This behavior is consistent since iOS 13.4 and has not changed.

**Consequences:**
The "Leaving Now" feature is unreliable as a pre-trip preparation tool if the user prepares more than a week ahead.

**How to avoid:**
1. Document this limitation clearly in the UI: "Offline data expires after 7 days of inactivity. Refresh before departing."
2. Show the "Last snapshot taken: [date]" in the Leaving Now UI so the user knows if it's stale
3. Trigger the snapshot as late as possible (day of departure, not days ahead)
4. Consider a "Refresh offline data" button on the trip day view

**Phase to address:** PWA Offline phase — surface the limitation in the UI.

---

### Pitfall 8: Trip Day Sequencer Time Logic Breaks Without Explicit Timezone Handling

**What goes wrong:**
The sequencer generates a departure checklist with time-based steps ("check weather at 7am," "pack cooler 30 min before departure"). The logic uses `new Date()` and relative time arithmetic. When the device timezone doesn't match the trip destination timezone, all times are off. A 7am reminder fires at 4am local time.

**Why it happens:**
JavaScript `Date` objects are timezone-aware but most date arithmetic ignores this. `new Date()` returns local time, but comparisons and displays are inconsistent without explicit timezone normalization.

**Consequences:**
Sequencer shows wrong times. Time-sensitive steps (weather check, safety email) trigger at wrong moments.

**How to avoid:**
Store all times as UTC in the database. Display times using the Intl.DateTimeFormat API with an explicit timezone:
```typescript
new Intl.DateTimeFormat('en-US', {
  timeZone: trip.locationTimezone || 'America/New_York',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(step.scheduledAt))
```
For v1.1, the simpler fix is: use device local time only, make no assumptions about destination timezone, and document this constraint. The camping destinations are in the same region as the device (NC/SE US).

**Phase to address:** Trip Execution phase — use UTC + display formatting from the start.

---

### Pitfall 9: Safety Email Requires a Server-Side Route — Cannot Send from the Browser

**What goes wrong:**
Sending email from a browser requires either a public SMTP relay or a service with a publicly-exposed API key. If the Nodemailer or SendGrid API key is put in client-side code (even in `NEXT_PUBLIC_` env vars), it will be visible in browser DevTools and could be abused to send spam. SMTP credentials in client-side code are a hard security failure.

**Why it happens:**
The app has no traditional backend — it's a Next.js app with API routes. It's easy to accidentally write email-sending logic in a client component.

**Consequences:**
Either the email feature is built in a way that exposes credentials (security failure), or it's blocked by browser security policies (CORS, no direct SMTP from browser).

**How to avoid:**
Build the safety email as a Next.js API route (`POST /api/trips/[id]/safety-email`). The route runs server-side and can safely use Nodemailer with environment variable credentials. The client sends a single POST request to trigger it.

For simplicity with a single-user app: use Nodemailer with a Gmail App Password (not a Google OAuth flow). The credential lives in `.env` as `EMAIL_SMTP_PASSWORD`. This is the fastest path to working email with no external service dependency.

**Phase to address:** Trip Execution phase — route architecture decision, not just implementation detail.

---

### Pitfall 10: Post-Trip Voice Debrief via Web Speech API Fails on iOS Safari PWA

**What goes wrong:**
The Web Speech API (`SpeechRecognition`) works well in desktop Chrome. On iOS, all browsers use WebKit — Chrome on iOS is WebKit with Chrome UI, not Blink. The Web Speech API is partially supported in Safari on iOS but has documented bugs: `isFinal` is sometimes always `false`, the API fails silently in PWA/home screen mode, and microphone permission prompts don't appear consistently.

**Why it happens:**
App Store rules require all iOS browsers to use WebKit. Desktop Chrome behavior does not translate to iOS Chrome.

**Consequences:**
Voice debrief built for desktop Chrome doesn't work on iPhone — the primary device for post-trip use.

**How to avoid:**
Build the debrief input as text-first with voice as progressive enhancement:
1. Default: textarea for typed debrief notes
2. Enhancement: voice button using Web Speech API with runtime feature detection
3. If voice is important: use the Anthropic API with Whisper or a similar service — record audio via `MediaRecorder` API, POST the audio blob to a Next.js API route, transcribe server-side

Test on actual iOS Safari before building the UI around voice.

**Phase to address:** Learning Loop phase — build text input first, voice second.

---

### Pitfall 11: Prisma Schema Additions for Learning Loop Can Break in Dev Due to SQLite ALTER TABLE Limitations

**What goes wrong:**
SQLite has extremely limited `ALTER TABLE` support — it cannot add `NOT NULL` columns without a default value to an existing table that has rows. If the `TripFeedback` table or new columns are added via `prisma migrate dev` on a database that already has seed data, the migration may fail with a generic SQLite error or silently produce wrong schema.

**Why it happens:**
Prisma generates standard SQL that works in Postgres but hits SQLite's `ALTER TABLE` limitations. The error messages from SQLite are often unhelpful ("near 'NOT NULL': syntax error").

**Consequences:**
Migration fails in dev. Developer resets the database to recover. Seed data is lost and must be re-run.

**How to avoid:**
1. All new columns on existing tables should have a default value or be nullable in the Prisma schema
2. When adding a table with required fields, run `prisma migrate dev` before seeding the database
3. Keep `npm run db:reset` handy — for a personal dev app, resetting + reseeding is an acceptable recovery
4. Before running any migration that touches existing tables with data, backup the dev database: `cp prisma/dev.db prisma/dev.db.bak`

**Phase to address:** Stabilization phase and Learning Loop phase — both add schema changes.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `localStorage` for "Leaving Now" offline data | 5 min to implement | 5MB limit hit immediately with packing list + photos; breaks service worker integration | Never — use IndexedDB |
| Mutating gear records directly in post-trip debrief | Simpler data model | No trip history, no undo, learning loop corrupts source of truth | Never — always append feedback |
| Caching `/api/*` responses in service worker | "Free" offline API | Stale mutations, data mismatches, confusing debugging | Never — use NetworkOnly for API routes |
| Using `.parse()` instead of `.safeParse()` in existing routes | Shorter code | ZodError swallowed by outer catch, 500 instead of 400, hard to debug | Only in new isolated routes with dedicated error middleware |
| Skipping timezone handling in sequencer | Simpler date logic | Wrong times displayed for users in different zones | Acceptable if scoped to local device timezone only (document the constraint) |
| Sending safety email from client using EmailJS | No server code needed | API key exposed in browser JS | Never — use server-side API route |
| Disabling service worker entirely in production for simplicity | No caching bugs | No offline capability — the whole PWA feature doesn't work | Only as a temporary debug step, never ship disabled |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Serwist + Next.js 16 | Assuming Turbopack works out of the box | Use `--webpack` flag for builds; or use `@serwist/turbopack` v9+ explicitly |
| Serwist dev mode | Testing offline behavior in development | `disable: process.env.NODE_ENV === 'development'` — dev mode disables the SW; test offline in production build only |
| Nodemailer + Gmail | Using regular Gmail password | Use Gmail App Password via Google Account security settings; regular password fails with modern Google auth |
| IndexedDB on iOS | Assuming 5GB quota like desktop | iOS PWA has ~50MB Cache API quota and clears after 7 days inactivity |
| Zod + Prisma types | Assuming Prisma types = Zod schema | They're separate — a `GearItem` from Prisma has `Date` objects; Zod may receive ISO strings from JSON; use `z.coerce.date()` for date fields |
| Claude API responses | Trusting JSON.parse without schema | Claude sometimes returns JSON with extra text, markdown fences, or truncated output; always extract + validate |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Caching entire trip dataset in IndexedDB on every "Leaving Now" | Slow snapshot trigger, high memory | Only cache the active trip's data: packing list, weather, key locations | Over 5 trips with photos each |
| Service worker intercepts and reads IndexedDB on every API request | 100–300ms added latency for all requests | Only intercept when offline (`navigator.onLine === false`) | Every page load |
| Packing list learning query scans all TripFeedback rows | Slow list generation as trips accumulate | Add index on `TripFeedback.gearItemId`; limit feedback query to last 10 trips | After 20+ trips |
| Running Claude API call to generate learning summary on every debrief save | Slow save, high API cost | Batch debrief feedback writes; generate AI summary async or on-demand | Every save event |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent service worker update (skipWaiting without notification) | User mid-session sees page reload; state lost | Show "Update available — tap to refresh" banner; let user control timing |
| "Leaving Now" button with no feedback or confirmation | User doesn't know if snapshot worked; leaves without offline data | Show spinner during snapshot, then "Ready for offline — X items cached" confirmation |
| Debrief form too long (rate every item, rate every day) | ADHD-hostile; user skips it entirely | One screen: "Anything you'd do differently?" + checkboxes for unused gear. Short wins. |
| Sequencer shows all steps at once | Overwhelming pre-departure checklist | Progressive disclosure: show current step + next 2. Mark done as you go. |
| Offline mode with no indicator | User confused why saves aren't working | Always-visible offline indicator when service worker is in offline mode |
| Safety email as a buried settings feature | User never finds it; doesn't set up emergency contact | Surface it in trip creation flow: "Add emergency contact email (optional)" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **PWA/Offline:** Service worker registered and showing in DevTools — verify it actually serves cached content by throttling to Offline in DevTools. Registration success does not mean offline works.
- [ ] **Leaving Now:** Button click triggers API calls — verify data is actually in IndexedDB (DevTools > Application > IndexedDB) after the snapshot completes.
- [ ] **Safety Email:** API route returns 200 — verify the email actually arrives in the inbox. SMTP config issues surface only at send time.
- [ ] **Zod Validation:** Schema added to Claude API route — verify schema matches the actual Claude output by logging a real response and running it through the schema in a test.
- [ ] **Learning Loop:** Post-trip feedback saved — verify feedback rows appear in `TripFeedback` table (Prisma Studio), not just that the save call returned 200.
- [ ] **Sequencer:** Steps generated and displayed — verify the time calculations are correct by setting device clock forward and checking step order.
- [ ] **Offline Maps:** App works offline — verify specifically that the Spots map shows tiles, not just that the app shell loads. Tiles and app shell are separate caches.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service worker caching API routes, stale data | MEDIUM | Clear service worker in DevTools > Application > Service Workers > Unregister; add NetworkOnly rule; redeploy |
| Zod .parse() throwing ZodError caught as 500 | LOW | Switch to .safeParse(); add `instanceof ZodError` check in catch blocks to return 400 |
| Learning loop mutated gear records with bad debrief data | HIGH | No automatic undo if mutation-based; add TripFeedback table and migrate to event model before this is possible |
| iOS cleared IndexedDB offline snapshot | LOW | User re-triggers "Leaving Now" and takes a new snapshot; add refresh reminder to UI |
| Prisma migration failed, dev.db corrupted | LOW | `npm run db:reset` resets + reseeds; add `cp prisma/dev.db prisma/dev.db.bak` to pre-migration habit |
| Safety email SMTP credentials wrong in production | LOW | Rotate Gmail App Password; update `.env`; retry |
| Serwist/Turbopack build conflict | MEDIUM | Add `--webpack` flag to build script; clear `.next` cache; rebuild |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Serwist requires Webpack build flag | PWA Offline — first task | `next build` produces `/sw.js`; DevTools shows service worker registered |
| API routes cached as stale responses | PWA Offline — routing config | Network tab while online shows API calls hit server, not service worker |
| Leaving Now uses IndexedDB, not SW cache | PWA Offline — architecture | DevTools IndexedDB shows trip data after snapshot; data survives browser restart |
| iOS 7-day storage clearing | PWA Offline — UI copy | Snapshot age shown in UI; refresh reminder present |
| Learning loop appends feedback, doesn't mutate | Learning Loop — schema first | `TripFeedback` table exists; gear records unchanged after debrief |
| Zod uses safeParse, not parse | Stabilization — shared utility | `parseClaudeJSON` utility in `lib/claude.ts`; all AI routes use it |
| Null vs undefined breaks existing clients | Stabilization — schema audit | Test each updated endpoint with actual browser request from existing UI |
| Safety email server-side only | Trip Execution — route design | No NEXT_PUBLIC_ env vars used for email credentials |
| Voice debrief iOS fallback | Learning Loop — text-first UI | Text input works without microphone; voice button hidden on unsupported browsers |
| Timezone in sequencer | Trip Execution — UTC storage | All scheduled times stored as UTC; displayed with Intl.DateTimeFormat |
| Prisma ALTER TABLE SQLite limits | Stabilization + Learning Loop | `prisma migrate dev` succeeds; `prisma db:reset` tested after each schema addition |

---

## Sources

- [Build a Next.js 16 PWA with true offline support — LogRocket Blog](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Serwist Getting Started — @serwist/next](https://serwist.pages.dev/docs/next/getting-started)
- [Serwist Turbopack support issue #54](https://github.com/serwist/serwist/issues/54)
- [Building Offline-First Next.js 15 App Router — vercel/next.js Discussion #82498](https://github.com/vercel/next.js/discussions/82498)
- [Next.js PWA Guide (Official)](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Offline-First Frontend Apps 2025 — LogRocket Blog](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [PWA Offline Storage Strategies — DEV Community](https://dev.to/tianyaschool/pwa-offline-storage-strategies-indexeddb-and-cache-api-3570)
- [Zod safeParse vs parse — Codú](https://www.codu.co/niall/zod-parse-versus-safeparse-what-s-the-difference-7t_tjfne)
- [Using Zod to validate Next.js API routes — Dub](https://dub.co/blog/zod-api-validation)
- [Common Data Loss Scenarios in Prisma Schema Changes — DEV Community](https://dev.to/vatul16/common-data-loss-scenarios-solutions-in-prisma-schema-changes-52id)
- [Prisma Migrate Limitations and Known Issues — Prisma Docs](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)
- [Nodemailer vs EmailJS comparison — Mailtrap](https://mailtrap.io/blog/nodemailer-vs-emailjs/)
- [Overcoming challenges in AI feedback loop integration — Glean](https://www.glean.com/perspectives/overcoming-challenges-in-ai-feedback-loop-integration)
- [Stale data and caching debugging in React apps — freeCodeCamp](https://www.freecodecamp.org/news/why-your-ui-wont-update-debugging-stale-data-and-caching-in-react-apps/)

---
*Pitfalls research for: Outland OS v1.1 — Close the Loop (PWA, learning loop, trip execution, stabilization)*
*Researched: 2026-04-01*
