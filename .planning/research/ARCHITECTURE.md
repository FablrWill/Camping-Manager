# Architecture Research: Self-Hosting Deployment

**Domain:** Production deployment of Next.js 16 + SQLite camping app on Mac mini
**Researched:** 2026-04-02
**Confidence:** HIGH for Next.js standalone deployment; HIGH for PM2 process management; MEDIUM for native dep handling (better-sqlite3 build on target machine); HIGH for Tailscale remote access

---

## Existing Architecture Baseline

```
Browser (Phone/Desktop)
  --> Server Components (data fetch via Promise.all)
        --> Client Components (useState, useCallback, useEffect)
              --> REST API Routes (try/catch, NextResponse.json)
                    --> Prisma ORM --> SQLite file (prisma/dev.db)
                    --> better-sqlite3 + sqlite-vec --> same SQLite file (RAG)
                    --> External Services (Claude API, Open-Meteo, OpenAI Whisper, Voyage AI)

Static assets:
  public/sw.js       -- PWA service worker
  public/photos/*    -- uploaded/imported photos (on disk, not in DB)

Environment:
  DATABASE_URL       -- file:./dev.db (relative to prisma/)
  ANTHROPIC_API_KEY  -- Claude AI features
  OPENAI_API_KEY     -- Whisper voice transcription
  VOYAGE_API_KEY     -- knowledge base embeddings
  GMAIL_USER         -- float plan email
  GMAIL_APP_PASSWORD -- Gmail SMTP
```

The deployment challenge: this is NOT a typical Vercel-friendly Next.js app. It has native Node.js bindings (better-sqlite3, sqlite-vec), on-disk photo storage, and a SQLite file database. These are strengths for self-hosting (zero cloud costs, data stays local) but mean the deployment must handle native compilation on the target machine.

---

## Target Architecture: Production on Mac mini

```
                    Internet
                       |
              ┌────────┴────────┐
              │   Tailscale     │  (VPN mesh -- Will's phone + Mac mini)
              │   or Cloudflare │  (Tunnel -- if public access needed)
              └────────┬────────┘
                       |
              ┌────────┴────────┐
              │    Mac mini     │  (always-on, Asheville)
              │   macOS 15+    │
              │                 │
              │  ┌────────────┐ │
              │  │    PM2     │ │  Process manager (auto-restart, logs)
              │  │            │ │
              │  │  ┌────────┐│ │
              │  │  │Next.js ││ │  Standalone build (.next/standalone/server.js)
              │  │  │:3000   ││ │  PORT=3000
              │  │  └───┬────┘│ │
              │  └──────┼─────┘ │
              │         |       │
              │  ┌──────┴─────┐ │
              │  │  SQLite DB │ │  /data/outland/outland.db
              │  │  (WAL mode)│ │
              │  └────────────┘ │
              │                 │
              │  ┌────────────┐ │
              │  │   Photos   │ │  /data/outland/photos/
              │  └────────────┘ │
              └─────────────────┘
```

### Key Decision: No Reverse Proxy Needed

Nginx/Caddy is recommended for multi-service or public-facing production. For a single-user app accessed via Tailscale VPN, it adds complexity with zero benefit. Next.js's built-in server handles static files, API routes, and SSR. Skip the reverse proxy.

If Will later wants public access (sharing trip maps), add Cloudflare Tunnel at that point -- it terminates TLS at Cloudflare's edge, so still no local reverse proxy needed.

---

## Component Changes: Dev vs Production

### Modified Components

| Component | Dev Behavior | Production Change | Why |
|-----------|-------------|-------------------|-----|
| `next.config.ts` | Default output | Add `output: 'standalone'` | Creates minimal deployable bundle |
| `prisma/schema.prisma` | `file:./dev.db` | `file:/data/outland/outland.db` via env | Absolute path outside project dir |
| `public/sw.js` | Skipped (NODE_ENV check) | Active, caches app shell + API | PWA offline support |
| Photo upload routes | Write to `public/photos/` | Write to `/data/outland/photos/` | Persistent storage outside build dir |
| `lib/rag/db.ts` | Resolves relative path | Same logic works with absolute path | `resolveDbPath()` already handles absolute paths |

### New Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| `ecosystem.config.cjs` | PM2 process config | Defines env vars, restart policy, log paths |
| `scripts/deploy.sh` | Build + copy + restart script | Runs on Mac mini after git pull |
| `.env.production` | Production environment variables | Lives on Mac mini, NOT in repo |

### Unchanged Components

Everything else works as-is. Server Components, Client Components, API routes, Prisma queries, Claude integration, weather API, email -- all unchanged. The app does not know or care that it is running on a Mac mini vs `next dev`.

---

## Critical Integration Points

### 1. Native Dependencies (better-sqlite3, sqlite-vec)

**The problem:** `npm run build` currently fails because better-sqlite3 and sqlite-vec have native C++ bindings that must be compiled for the target platform. The build step tries to bundle them, which fails.

**The solution (already partially in place):**

The project already has `serverExternalPackages` in `next.config.ts`:
```typescript
serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio']
```

This tells Next.js to NOT bundle these packages -- they stay as external `require()` calls. The standalone build will look for them in `node_modules/` at runtime.

**What needs to happen for production build:**

1. Build MUST happen on the Mac mini (or on a machine with the same architecture -- Apple Silicon)
2. `npm install` compiles native bindings for the target platform
3. `next build` with `output: 'standalone'` creates `.next/standalone/`
4. The standalone output does NOT include all of `node_modules/` -- only traced dependencies
5. Native packages excluded via `serverExternalPackages` must be manually copied: `.next/standalone/node_modules/better-sqlite3/` and `.next/standalone/node_modules/sqlite-vec/`

**Alternative approach (simpler, recommended):** Do NOT use standalone output. Instead, do a standard `npm run build` + `npm run start` on the Mac mini with the full `node_modules/` in place. The standalone output optimization (smaller deployment) is designed for Docker/CI -- for a Mac mini with plenty of disk space, a full `node_modules/` is simpler and avoids the native dep copy problem entirely.

**Recommendation:** Use standard build (not standalone) because:
- Single deployment target (Mac mini) -- no need to minimize bundle
- Native deps (better-sqlite3, sqlite-vec) just work with full node_modules
- Less deployment complexity
- PM2 runs `next start` which uses the `.next/` build output + `node_modules/`

### 2. SQLite Database Path

**Dev:** `DATABASE_URL="file:./dev.db"` -- resolves to `prisma/dev.db` relative to schema
**Production:** `DATABASE_URL="file:/data/outland/outland.db"` -- absolute path

Why `/data/outland/`:
- Outside the project directory (survives `git pull`, `npm install`, rebuilds)
- Easy to back up (single directory with DB + photos)
- macOS convention for app data (or use `~/outland-data/` if `/data/` feels heavy)

The existing `lib/rag/db.ts` `resolveDbPath()` already handles absolute paths (line 18: `if (relativePath.startsWith('/')) return relativePath`). No code change needed.

**Migration from dev.db:** Copy `prisma/dev.db` to `/data/outland/outland.db` once. Run `npx prisma migrate deploy` (not `migrate dev`) in production to apply any pending migrations without resetting data.

### 3. Photo Storage

**Dev:** Photos saved to `public/photos/` and served via Next.js static file serving
**Production problem:** The `public/` directory is part of the build. Photos should persist outside the build directory.

**Options:**

A. **Symlink (recommended):** `public/photos -> /data/outland/photos/`. Zero code changes. Next.js serves files from the symlink transparently. Create the symlink in the deploy script.

B. **Custom API route for serving photos:** Add `GET /api/photos/[filename]` that reads from `/data/outland/photos/` and streams the file. Requires changing all photo URL references.

C. **Keep photos in public/ but outside git:** Add `public/photos/` to `.gitignore` (already likely is), accept that photos live inside the project dir. Simpler but couples data to deploy location.

**Recommendation:** Symlink (Option A). It is one line in the deploy script (`ln -sf /data/outland/photos public/photos`) and requires zero code changes. The upload routes already write to `public/photos/` -- they continue to do so, and the symlink redirects to persistent storage.

### 4. Service Worker in Production

The service worker is already gated behind `NODE_ENV === 'production'`. In production, it will:
- Cache the app shell (/, /gear, /trips, /spots, /vehicle, /settings)
- Cache API responses (network-first with fallback)
- Cache map tiles

No changes needed. It will work on the Mac mini's `next start` because `NODE_ENV=production` is set automatically.

**One consideration:** The SW caches the app shell on first visit. After a deploy, the SW serves stale cached pages until the user refreshes. The existing `CACHE_NAME = 'outland-shell-v1'` should be bumped on deploy (e.g., `outland-shell-v2`). Add a version bump to the deploy script, or use a build hash.

### 5. Environment Variables

Production `.env.production` on Mac mini (NOT committed to git):

```bash
# Database
DATABASE_URL="file:/data/outland/outland.db"

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=pa-...

# Email (float plan)
GMAIL_USER=will@...
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Server
PORT=3000
HOSTNAME=0.0.0.0
```

`HOSTNAME=0.0.0.0` is important -- it makes Next.js listen on all interfaces, not just localhost. Required for Tailscale to reach the server.

---

## Process Management: PM2

PM2 is the standard Node.js process manager. Use it because:
- Auto-restarts on crash
- Starts on Mac mini boot (via `pm2 startup`)
- Log rotation built-in
- Simple to configure
- No Docker overhead for a single-app deployment

### PM2 Configuration

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'outland',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/Users/willis/outland-os',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    env_file: '.env.production',
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/data/outland/logs/error.log',
    out_file: '/data/outland/logs/out.log',
    merge_logs: true,
  }]
};
```

### PM2 Startup on Boot

```bash
pm2 startup    # generates launchd config for macOS
pm2 save       # saves current process list
```

This creates a macOS LaunchAgent that starts PM2 (and Outland) when the Mac mini boots.

---

## Remote Access: Tailscale

**Use Tailscale, not Cloudflare Tunnel.** Rationale:

| Factor | Tailscale | Cloudflare Tunnel |
|--------|-----------|-------------------|
| Setup | Install app, sign in, done | Install cloudflared, configure tunnel, DNS records |
| Security | End-to-end encrypted, no middleman | Cloudflare terminates TLS, sees traffic |
| Use case fit | Private access for one user | Public-facing services |
| Phone access | Tailscale app on iPhone, always-on VPN | Access via public URL |
| Cost | Free for personal (up to 100 devices) | Free tier available |
| Latency | Direct P2P connection (WireGuard) | Routed through Cloudflare edge |

Will accesses `http://100.x.y.z:3000` (Tailscale IP) from his phone. No DNS, no TLS certificate management, no public exposure.

**If public access is needed later** (sharing a trip map link with a friend), add Cloudflare Tunnel as a second layer. Tailscale stays as the private admin channel.

### Tailscale Setup

1. Install Tailscale on Mac mini + iPhone
2. Both devices join Will's Tailscale network (tailnet)
3. Mac mini gets a stable IP (e.g., `100.64.0.1`)
4. iPhone accesses `http://100.64.0.1:3000`
5. Optional: enable MagicDNS for `mac-mini.tail12345.ts.net:3000`

---

## Deployment Flow

### Initial Setup (one-time)

```bash
# On Mac mini
mkdir -p /data/outland/{photos,logs,backups}
cd ~/outland-os
git clone <repo> .
npm install                    # compiles native deps for Apple Silicon
cp .env.example .env.production
# Edit .env.production with production values
npx prisma migrate deploy      # apply migrations without reset
ln -sf /data/outland/photos public/photos
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 startup
pm2 save
```

### Subsequent Deploys

```bash
# scripts/deploy.sh
#!/bin/bash
set -e
cd ~/outland-os
git pull origin main
npm install                    # recompiles native deps if needed
npx prisma migrate deploy      # apply any new migrations
npm run build
pm2 restart outland
echo "Deploy complete. Outland is running."
```

### Data Backup

```bash
# Cron job: daily SQLite backup
# SQLite .backup command is safe for WAL mode (consistent snapshot)
0 3 * * * sqlite3 /data/outland/outland.db ".backup '/data/outland/backups/outland-$(date +\%Y\%m\%d).db'"
```

---

## Data Flow: Production vs Dev

```
Dev:
  npm run dev --> Turbopack dev server --> prisma/dev.db
                                      --> public/photos/ (local dir)

Production:
  pm2 start --> next start --> .next/ build output
                           --> node_modules/ (full, with native deps)
                           --> /data/outland/outland.db (via DATABASE_URL)
                           --> /data/outland/photos/ (via symlink from public/photos)
                           --> Tailscale VPN --> Will's phone
```

No code changes to the app. The difference is purely configuration:
- `DATABASE_URL` points to production DB path
- `HOSTNAME=0.0.0.0` allows external connections
- PM2 manages the process lifecycle
- Tailscale provides the network path

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Docker for a Single-App Mac mini

**What people do:** Containerize the Next.js app in Docker, manage with docker-compose.

**Why it is wrong here:** Docker adds a virtualization layer that complicates native dep compilation (must match container arch to host arch), file system access (volume mounts for SQLite + photos), and debugging. For a single app on a dedicated machine, Docker provides isolation benefits that are not needed.

**Do instead:** Run directly on macOS with PM2. Native deps compile for the host architecture. File paths are direct. Debugging is `pm2 logs outland`.

### Anti-Pattern 2: Standalone Output with Native Dependencies

**What people do:** Set `output: 'standalone'` in next.config and deploy the minimal `.next/standalone/` directory.

**Why it is wrong here:** Standalone output traces JavaScript dependencies but does NOT automatically include native `.node` binary files from `serverExternalPackages`. You end up manually copying native module directories into the standalone output, which is fragile and error-prone.

**Do instead:** Standard build (`next build` without standalone) + full `node_modules/`. The Mac mini has plenty of disk space. The ~200MB `node_modules/` is irrelevant.

### Anti-Pattern 3: Using `next dev` in Production

**What people do:** Run `next dev` on the server because "it works."

**Why it is wrong:** Dev mode recompiles on every request, has no caching, leaks detailed error messages, and the service worker is disabled. Performance is 10-50x worse than production build.

**Do instead:** Always `next build` + `next start` (or via PM2). Production mode enables all optimizations, static generation, and response caching.

### Anti-Pattern 4: Exposing Next.js Directly to the Internet

**What people do:** Port-forward 3000 on their router.

**Why it is wrong:** No TLS, no DDoS protection, exposes home IP, no rate limiting. Next.js is not designed to be internet-facing without a proxy.

**Do instead:** Tailscale for private access (encrypted, no port forwarding). If public access is needed, Cloudflare Tunnel (TLS termination at edge, DDoS protection, hides home IP).

---

## Build Order: Deployment Phases

Dependencies flow top-down:

```
Phase 1: Fix Build (BLOCKER -- nothing else works without this)
  1. Fix npm run build failure (native deps)
  2. Verify next build succeeds on Mac mini
  3. Verify next start serves the app correctly

Phase 2: Production Data Layout
  4. Create /data/outland/ directory structure
  5. Migrate dev.db to production path
  6. Set up photo symlink
  7. Create .env.production
  8. Run prisma migrate deploy

Phase 3: Process Management
  9. Install PM2 globally
  10. Create ecosystem.config.cjs
  11. Start app via PM2
  12. Configure PM2 startup (boot persistence)
  13. Set up log rotation

Phase 4: Remote Access
  14. Install Tailscale on Mac mini
  15. Install Tailscale on iPhone
  16. Verify phone can reach Mac mini on Tailscale IP
  17. Add PWA to iPhone home screen via Tailscale URL

Phase 5: Operational
  18. Set up SQLite backup cron
  19. Document deploy script
  20. Test deploy cycle (git pull -> build -> restart)
```

**Phase 1 is the critical blocker.** The `npm run build` failure must be fixed before any deployment work. This is the existing tech debt item from Phase 3 RAG: native deps (better-sqlite3, sqlite-vec) cause the build to fail.

---

## Scalability Considerations

| Concern | At Launch | At 1 Year | At 3 Years |
|---------|-----------|-----------|------------|
| SQLite DB size | ~5MB | ~50MB (photos metadata, trips, RAG chunks) | ~200MB |
| Photo storage | ~500MB | ~5GB | ~20GB |
| Response time | <100ms (local network) | Same | Same (SQLite scales to GB) |
| Backup size | Trivial | ~5GB (DB + photos) | ~20GB |
| Memory usage | ~200MB (Next.js) | Same | Same |

Mac mini (16GB+ RAM, 256GB+ SSD) handles this easily for years. SQLite with WAL mode supports the single-writer/multiple-reader pattern. No database migration needed.

**When to migrate off Mac mini:** If Will wants always-available public access, multi-device sync, or the Mac mini hardware fails. At that point, consider Fly.io with LiteFS (SQLite replication) or migrate to Postgres on a VPS.

---

## Sources

- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) -- HIGH confidence, official docs
- [Next.js output configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) -- HIGH confidence, official docs
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) -- HIGH confidence, official docs
- [PM2 Production Deployment Guide](https://pm2.keymetrics.io/docs/usage/quick-start/) -- HIGH confidence, official docs
- [Tailscale Getting Started](https://tailscale.com/kb/1017/install) -- HIGH confidence, official docs
- [Tailscale vs Cloudflare Tunnel comparison](https://www.lowerhomeserver.vip/blog/optimization/tailscale-vs-cloudflare-tunnel) -- MEDIUM confidence, third-party comparison
- [Self-hosting Next.js with PM2](https://www.headystack.com/self-host-nextjs) -- MEDIUM confidence, community guide
- [Next.js Standalone Build guide](https://prototypr.io/note/nextjs-standalone-build-local-production) -- MEDIUM confidence, community guide

---

*Architecture research for: Outland OS v1.2 Ship It -- Self-Hosting Deployment*
*Researched: 2026-04-02*
