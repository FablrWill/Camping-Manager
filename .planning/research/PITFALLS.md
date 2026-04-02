# Pitfalls Research

**Domain:** Self-hosting Next.js 16 + SQLite app on Mac mini, tech debt cleanup
**Researched:** 2026-04-02
**Confidence:** HIGH (verified against official Next.js docs, community reports, project source)

---

## Critical Pitfalls

Mistakes that cause broken deploys, data loss, or security exposure.

---

### Pitfall 1: Native Deps Break `npm run build` (Already Happening)

**What goes wrong:**
`npm run build` fails because webpack tries to bundle `better-sqlite3` and `sqlite-vec` native `.node` binaries. The project already has `serverExternalPackages` configured in `next.config.ts`, but the build still fails per the v1.1 audit. The likely cause: transitive dependencies or RAG code path imports these modules in a way that webpack still resolves during static analysis of client-side or shared code.

**Why it happens:**
Next.js statically analyzes all imports at build time. If any file imported by a page or layout (even indirectly) references a native module, webpack attempts to bundle it. `serverExternalPackages` only applies to server-side code paths. A single shared utility that imports `better-sqlite3` and is also imported by a client component creates the failure. Additionally, `better-sqlite3` v12.x has known build failures on Node.js 24+ and 25+ due to deprecated V8 APIs.

**How to avoid:**
1. Audit every import chain from RAG/search code -- ensure no client component transitively imports native modules
2. Use dynamic `import()` for native modules in server-only files
3. Add `import 'server-only'` guard to any file that touches `better-sqlite3` or `sqlite-vec`
4. Pin Node.js to 20 LTS or 22 LTS (avoid 24+; better-sqlite3 has C++ compilation failures on newer V8)
5. Next.js 16.1 fixed transitive dependency handling for `serverExternalPackages` -- verify the project is on 16.1+ or upgrade

**Warning signs:**
- `Module not found: Can't resolve 'better-sqlite3'` during build
- C++ compilation errors mentioning `v8::CopyablePersistentTraits` during `npm install`
- Build succeeds in `next dev` but fails with `next build`

**Phase to address:**
Tech debt / build fix (first priority -- blocks all deployment)

---

### Pitfall 2: Missing `output: 'standalone'` for Self-Hosting

**What goes wrong:**
Without `output: 'standalone'` in `next.config.ts` (currently absent), `next build` produces output that expects the full `node_modules` directory at runtime. Deploying to Mac mini requires copying the entire project directory, and PM2 must run `next start` from the project root. Any `npm install` on the server that pulls a different version of a native dep causes silent breakage.

**Why it happens:**
Running `next start` from the project directory works in development and feels identical to production. But it is fragile -- the entire `node_modules` tree must be identical. Standalone mode produces a self-contained `server.js` with only the required files, making deployment atomic and reproducible.

**How to avoid:**
Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
  // ... rest of config
}
```
Then deploy `.next/standalone/` plus copy `.next/static/` and `public/` alongside it.

**Warning signs:**
- Deployment requires running `npm install` on the target server
- Different behavior between dev machine and server
- Native module version mismatch errors at runtime

**Phase to address:**
Build fix phase (part of getting `npm run build` working)

---

### Pitfall 3: Photos Stored in `public/` Get Deleted on Rebuild

**What goes wrong:**
User-uploaded photos live at `public/photos/` (confirmed in `app/api/photos/upload/route.ts`). With `output: 'standalone'`, the build copies `public/` into standalone output. But user-uploaded content added after the build is not preserved. Redeployment either overwrites the directory or starts with a clean copy, losing all photos uploaded since the last build.

**Why it happens:**
Next.js treats `public/` as static build assets. User-uploaded runtime content does not belong there in production because the build process does not preserve runtime-created files.

**How to avoid:**
1. Move photo storage outside the project directory: `~/outland-data/photos/`
2. Symlink `public/photos` to the external directory: `ln -s ~/outland-data/photos public/photos`
3. Or serve photos via a dedicated API route (`/api/photos/[filename]`) that reads from the external directory
4. For Mac mini single-user: the symlink approach is simplest. Create the external dir once, symlink, and the build never touches uploaded photos.

**Warning signs:**
- Photos disappear after redeployment
- `public/photos/` is empty on the server after build
- Build output size does not include previously uploaded photos

**Phase to address:**
Deployment phase (before first production deploy)

---

### Pitfall 4: SQLite Database Path Breaks in Standalone Mode

**What goes wrong:**
Prisma's `DATABASE_URL=file:./dev.db` is relative to the Prisma schema location. In standalone mode, the working directory changes to `.next/standalone/`. The database file is not found, or a new empty database is silently created in the wrong location, losing all existing data.

**Why it happens:**
Relative paths in `DATABASE_URL` resolve differently depending on the working directory at runtime. Standalone mode changes the runtime directory structure. Prisma does not warn about this.

**How to avoid:**
1. Use an absolute path in production `.env`: `DATABASE_URL=file:/Users/willis/outland-data/outland.db`
2. Set the env var in PM2's ecosystem config, not just `.env`
3. Run `prisma migrate deploy` against the absolute path before starting the app
4. Back up the database before every deployment: `cp outland.db outland.db.bak`

**Warning signs:**
- App starts but shows zero data (all stats read 0 on dashboard)
- Two database files exist in different locations
- Prisma errors about missing tables (fresh DB auto-created at wrong path)

**Phase to address:**
Deployment phase (environment configuration)

---

### Pitfall 5: No Auth + Public Tunnel = Anyone Can Access Everything

**What goes wrong:**
Exposing the app via Cloudflare Tunnel without authentication means anyone with the URL can view all personal data, trigger Claude API calls (real money), delete gear/trips, and upload files. Bots and scanners find public tunnel URLs within hours.

**Why it happens:**
The app was designed for single-user local use with no auth. Adding a tunnel turns a local-only app into a public web service. "Single user" does not mean "no authentication" -- it means "one account."

**How to avoid:**
- **Recommended: Tailscale only.** Creates a private mesh VPN using WireGuard. Only Will's devices (phone, laptop) can reach the Mac mini. No public URL, no auth needed, no attack surface. Zero configuration beyond installing the app on each device.
- **If public access needed:** Use Cloudflare Tunnel + Cloudflare Access (free tier) with email OTP before the tunnel reaches the app. This is Cloudflare's built-in zero-trust auth layer.
- **Never:** Expose the raw Next.js port via Cloudflare Tunnel without an auth layer in front.
- Tailscale is the clear winner here: simpler, more secure (no public exposure at all), and Will already has it on his roadmap.

**Warning signs:**
- Access logs showing unknown IPs or user agents
- Unexpected Claude API charges on Anthropic dashboard
- Data appearing that Will did not create

**Phase to address:**
Deployment phase (network access -- must be decided before going live)

---

### Pitfall 6: PM2 Memory Growth + Watch Mode Restart Loop

**What goes wrong:**
PM2 running Next.js can accumulate memory over time (reported: 35MB to 100MB+ in 10 minutes). If `max_memory_restart` is too low, PM2 restarts frequently, causing brief downtime on every restart. If `watch: true` is set in the PM2 config, SQLite WAL file changes and photo uploads trigger filesystem events, causing PM2 to restart the app in an infinite loop.

**Why it happens:**
Next.js caches server-rendered pages and data in memory. PM2's `watch` option monitors the entire working directory for file changes. SQLite in WAL mode writes `-wal` and `-shm` files on every transaction, and photo uploads create new files -- both trigger PM2's file watcher.

**How to avoid:**
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'outland-os',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    watch: false,               // CRITICAL: never watch in production
    max_memory_restart: '512M', // generous for single-user
    instances: 1,               // single instance for SQLite
    autorestart: true,
  }]
}
```

**Warning signs:**
- App randomly restarts (check `pm2 logs`)
- Memory climbing continuously in `pm2 monit`
- "SIGTERM" messages in logs after photo uploads or database writes

**Phase to address:**
Deployment phase (PM2 configuration)

---

### Pitfall 7: SQLite + PM2 Cluster Mode = Database Locked

**What goes wrong:**
If PM2 is configured with `instances: 2+` (cluster mode), multiple Node.js processes write to SQLite simultaneously. SQLite serializes writes via file-level locking. Under even light concurrent writes, this causes `SQLITE_BUSY` or `database is locked` errors.

**Why it happens:**
PM2 cluster mode is the standard recommendation for Node.js production apps. But SQLite is not a client-server database -- it uses file-level locking. Multiple processes competing for write locks causes contention that PM2 tutorials do not warn about.

**How to avoid:**
1. Run exactly 1 PM2 instance (`instances: 1`) -- more than sufficient for single-user
2. Enable WAL mode: `PRAGMA journal_mode=WAL` (better read concurrency)
3. Set busy timeout: `PRAGMA busy_timeout=5000` (retries instead of immediate failure)
4. Never use PM2 cluster mode or `instances: 'max'` with SQLite

**Warning signs:**
- Intermittent 500 errors on write operations (save gear, upload photo)
- `SqliteError: database is locked` in PM2 logs
- Data not saving reliably despite no visible errors in UI

**Phase to address:**
Deployment phase (PM2 config -- enforce `instances: 1`)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping `output: 'standalone'` | Simpler deploy (just `next start`) | Fragile deploys, node_modules drift between machines | Never for production self-hosting |
| Photos in `public/` without symlink | Works in dev, zero config | Data loss on redeploy | Dev only; symlink or external dir in production |
| Relative `DATABASE_URL` | Works from project root | Breaks in standalone mode, hard to locate DB | Dev only; absolute path in production |
| `variant="outline"` left broken | Does not crash (renders unstyled) | Inconsistent UI, user hesitates to click Retry | Fix in tech debt phase -- 5 min fix |
| `it.todo` test stubs left in place | Documents future intent | Inflates test count, gives false impression of coverage | Track and either implement or remove |
| Settings placeholder card | Page exists in nav | Looks unfinished, confuses user | Remove or populate with real settings |
| Raw `<button>` in PackingList/MealPlan | Works functionally | Inconsistent with design system, looks different from all other buttons | Fix in tech debt phase -- swap to Button component |

---

## Integration Gotchas

Common mistakes when connecting services for this deployment.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PM2 + standalone | Running `next start` instead of `node server.js` | Use `node .next/standalone/server.js` with PORT and HOSTNAME env vars |
| PM2 + env vars | Setting NODE_ENV only in `.env` file | Set in PM2 ecosystem config; use `pm2 restart --update-env` when changing |
| Tailscale + Next.js | Binding to `localhost` only | Set `HOSTNAME=0.0.0.0` so Tailscale IP (100.x.x.x) can reach the server |
| Cloudflare Tunnel | Tunneling to `localhost:3000` without auth | Put Cloudflare Access (free tier, email OTP) in front of tunnel |
| Prisma + standalone | Running `prisma migrate` inside the standalone output dir | Run migrations from the source project dir against the production DB path |
| Service worker + deploy | SW caches old static assets after redeployment | Version the SW cache name; increment on each deploy; add cache-busting |
| Claude API key | Key in `.env` committed to git or missing from PM2 config | `.env` in `.gitignore`; key in PM2 ecosystem env or system environment |
| Photo uploads + standalone | Photos written inside the standalone output dir | Write to external persistent directory; symlink `public/photos` |
| Node.js version | Using latest (24/25) with better-sqlite3 | Pin to Node 20 LTS or 22 LTS; use nvm `.nvmrc` file |
| `npm run build` on server | Building on Mac mini with different arch/Node than dev | Build on same machine or use standalone mode which bundles everything |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| SQLite DB on network drive or external disk | Slow queries, lock timeouts | Keep DB on Mac mini's internal SSD | Any network latency to storage |
| Unbounded photo directory (flat) | Slow `readdir`, large `public/` slows builds | Organize into date-based subdirs (`YYYY/MM/`) | 1000+ photos |
| No image optimization in production | Large photos served raw, slow mobile load on Tailscale | Use sharp to compress on upload (already present); verify it runs in production | Any photo-heavy page |
| SW caching entire app shell on install | Large initial SW download blocks first use | Cache critical routes only; lazy-cache rest | App shell exceeds 2MB |
| WAL file grows unbounded | Disk usage climbs, slightly slower writes | Run `PRAGMA wal_checkpoint(TRUNCATE)` periodically or on app start | After months of writes without restart |

---

## Security Mistakes

Domain-specific security issues for a self-hosted personal app.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No auth with public URL | Full data access, AI cost abuse, data deletion | Tailscale (private mesh) or Cloudflare Access (zero-trust) |
| API key in git or in server `.env` without protection | Claude API key leaked = unauthorized charges | Env var in PM2 config or system-level; never commit `.env`; `chmod 600 .env` |
| No rate limiting on AI routes | Accidental or malicious repeated calls = large Anthropic bill | Simple in-memory rate limiter: max 5 AI calls per minute |
| SQLite DB world-readable | Any local user/process on Mac mini can read all data | `chmod 600` on `.db` file; run PM2 as Will's user account |
| Photo upload accepts any file | Malicious files stored on server filesystem | Validate MIME type + extension; reject if sharp cannot process it; limit file size |
| SW serves stale content after security fix | User runs vulnerable old code from SW cache | Version SW cache; force update on deploy; consider `skipWaiting()` for security patches |
| PM2 logs contain API keys or personal data | Log files readable by other processes | Scrub sensitive data from error logging; rotate PM2 logs (`pm2 install pm2-logrotate`) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Broken `variant="outline"` on PostTripReview Retry | Button looks unstyled/broken, user hesitates to click | Fix ButtonVariant types; use valid variant like `secondary` |
| Settings placeholder card | User taps settings expecting functionality, finds dead card | Remove placeholder or populate with real settings (emergency contact, data export, API key status) |
| SW missing dynamic routes (`/trips/[id]/prep`, `/trips/[id]/depart`) | User visits online, goes offline, trip prep page fails | Pre-cache visited dynamic routes; or show clear "not available offline" message |
| No deploy status indicator | After redeploy, user does not know if they have latest version | Show build version/timestamp in settings or footer |
| No backup/export option | User has no way to back up their data | Add data export API route (JSON dump of all tables) |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces for production.

- [ ] **Build works:** `npm run build` completes without errors -- currently broken, first thing to verify
- [ ] **Standalone output:** `.next/standalone/server.js` exists and starts with `node server.js`
- [ ] **Database persists:** Stop and restart PM2 -- all data is still present
- [ ] **Photos persist:** Redeploy app -- previously uploaded photos still accessible
- [ ] **Env vars set:** All required env vars present in PM2 config (ANTHROPIC_API_KEY, DATABASE_URL, etc.)
- [ ] **SW updates:** Deploy new code, verify SW picks up changes within one refresh
- [ ] **Mobile access:** Phone reaches app via Tailscale IP or tunnel URL
- [ ] **AI features work:** Claude API calls succeed in production (test packing list generation)
- [ ] **Error pages render:** 404 and 500 pages display correctly, not raw stack traces
- [ ] **WAL mode active:** Check with `PRAGMA journal_mode;` -- should return `wal`
- [ ] **PM2 survives reboot:** Configure `pm2 startup` + `pm2 save` so app auto-starts after Mac mini restart
- [ ] **All 11 tech debt items resolved:** Button variants, placeholder card, test stubs, build, docs
- [ ] **No stale ROADMAP.md references:** v1.1 marked complete, Phase 11 checkboxes checked

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Photos lost on redeploy | MEDIUM | Restore from Time Machine backup; set up symlink to prevent recurrence |
| Wrong database path (empty DB) | LOW | Stop PM2; find correct DB file; update DATABASE_URL to absolute path; restart |
| Native dep build failure | MEDIUM | Pin Node.js with nvm; `npm rebuild better-sqlite3`; verify serverExternalPackages |
| PM2 restart loop | LOW | `pm2 stop outland-os`; check `pm2 logs`; set `watch: false`; restart |
| Unauthorized access via tunnel | HIGH | Disable tunnel immediately; rotate Claude API key; audit data; add auth before re-enabling |
| Database locked errors | LOW | Restart PM2 (clears stale locks); verify single instance; enable WAL mode |
| Memory growth in Node.js | LOW | PM2 auto-restarts on memory limit; investigate with `node --inspect` if frequent |
| Stale SW after deploy | LOW | Increment SW cache version; users get update on next visit |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Native deps break build | Tech debt / build fix (first) | `npm run build` exits 0; `.next/standalone/server.js` exists |
| Missing standalone output | Build fix phase | `ls .next/standalone/server.js` succeeds after build |
| Photos lost on redeploy | Deployment config phase | Upload photo, redeploy, verify photo still accessible |
| Database path breaks | Deployment config phase | Restart PM2, verify all data persists; confirm absolute path in env |
| No auth on tunnel | Network access phase | App unreachable without Tailscale connection or CF Access auth |
| PM2 memory/restart issues | Deployment config phase | Run `pm2 monit` for 30 min; no unexpected restarts |
| SQLite cluster lock | Deployment config phase | `instances: 1` in ecosystem.config; no SQLITE_BUSY errors |
| Broken button variants | Tech debt cleanup phase | All buttons render with correct design system styling |
| Test stubs unresolved | Tech debt cleanup phase | `grep -c 'it.todo'` returns 0 or all stubs implemented |
| Settings placeholder | Tech debt cleanup phase | Settings page shows real content or placeholder removed |
| ROADMAP.md inconsistencies | Tech debt cleanup phase | v1.1 header says "complete"; Phase 11 checkboxes checked |
| SW stale after deploy | Deployment verification | Deploy change, SW updates within 1 page refresh |
| Node.js version mismatch | Build fix phase | `.nvmrc` file present; CI/deploy scripts use pinned version |

---

## Sources

- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) -- official docs on standalone mode, env vars, PM2
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) -- excluding native modules from bundling
- [Next.js 16.1 release notes](https://nextjs.org/blog/next-16-1) -- transitive dependency fix for serverExternalPackages
- [better-sqlite3 Node 25 build failure](https://github.com/WiseLibs/better-sqlite3/issues/1411) -- C++ compilation errors on newer Node
- [better-sqlite3 database locked in Next.js](https://github.com/WiseLibs/better-sqlite3/issues/1155) -- multi-process SQLite locking
- [PM2 Ecosystem File docs](https://pm2.keymetrics.io/docs/usage/application-declaration/) -- configuration reference
- [PM2 memory leak report](https://github.com/Unitech/pm2/issues/4510) -- known memory growth issue
- [Tailscale vs Cloudflare Tunnel (2026)](https://www.lowerhomeserver.vip/blog/use-cases/secure-remote-access-comparison) -- security tradeoffs for home servers
- [Secrets of Self-hosting Next.js at Scale (2025)](https://www.sherpa.sh/blog/secrets-of-self-hosting-nextjs-at-scale-in-2025) -- production gotchas
- [Self-Host Next.js with PM2 and Nginx](https://www.headystack.com/self-host-nextjs) -- PM2 configuration patterns
- [Managing Next.js in Production with PM2](https://dev.to/mochafreddo/managing-nextjs-and-nestjs-applications-in-production-with-pm2-3j25) -- ecosystem config best practices
- Project source: `next.config.ts`, `package.json`, `.planning/milestones/v1.1-MILESTONE-AUDIT.md`

---
*Pitfalls research for: Outland OS v1.2 — Ship It (self-hosting, tech debt cleanup, Mac mini deployment)*
*Researched: 2026-04-02*
