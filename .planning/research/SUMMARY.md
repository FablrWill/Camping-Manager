# Project Research Summary

**Project:** Outland OS
**Domain:** Self-hosted Next.js PWA deployment on Mac mini + tech debt cleanup + cross-AI code review
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

Outland OS v1.2 "Ship It" is a deployment milestone, not a feature milestone. The app is already built across 25+ sessions (gear management, trip planning, maps, AI packing/meals/checklists, PWA offline, learning loop, voice debrief). The goal is to get it running in production on Will's Mac mini so he can access it from his phone anywhere via Tailscale VPN. The deployment is straightforward -- PM2 process management, Tailscale for private remote access, standard Next.js production build -- but one critical blocker exists: `npm run build` currently fails due to native SQLite dependencies (better-sqlite3, sqlite-vec) leaking into webpack's client-side bundle analysis.

The recommended approach is: fix the build first (likely a single import chain issue), skip standalone output mode in favor of standard `next build` + `next start` with full `node_modules` (simpler with native deps on a single Mac mini), configure persistent data paths for SQLite and photos outside the project directory, wrap it in PM2 for process management, and use Tailscale for encrypted private access. There is strong consensus across all four research files on this stack and approach. A cross-AI code review using Gemini's 1M-token context is a valuable differentiator -- a different model catches different blind spots after 25+ sessions of Claude-only development.

The key risks are: (1) the build failure is the single blocker and must be debugged first, (2) photo storage in `public/` will be lost on redeploy without a symlink to persistent storage, and (3) relative SQLite paths will silently create empty databases in the wrong location. All three have clear, well-documented fixes. The 11 tech debt items from the v1.1 audit are minor but should be resolved before shipping for a clean baseline. Overall, this is a well-understood deployment pattern with high confidence across the board.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.2.1, Prisma, SQLite, Tailwind, React 19, Leaflet) is validated and unchanged. Three additions are needed for production deployment.

See [STACK.md](./STACK.md) for full details.

**New additions:**
- **PM2 6.x**: Process management -- auto-restart on crash, boot persistence via launchd, log rotation. Industry standard for self-hosted Node.js. Fork mode only (cluster mode breaks SQLite).
- **Tailscale**: Encrypted mesh VPN -- private remote access from Will's phone, no port forwarding, no public exposure, free personal plan (100 devices). WireGuard-based with 5-15ms added latency.
- **Standard build (not standalone)**: `next build` + `next start` with full `node_modules/` -- avoids the complexity of manually copying native `.node` binaries into standalone output. The Mac mini has plenty of disk space; the ~200MB savings is irrelevant.

**Critical version requirement:** Pin Node.js to 20 LTS or 22 LTS. better-sqlite3 has C++ compilation failures on Node 24+.

**Notable divergence across research:** STACK.md recommends `output: 'standalone'`, while ARCHITECTURE.md argues against it for this use case (native deps + single deployment target). ARCHITECTURE.md's reasoning is stronger -- standalone mode is designed for Docker/CI deployments where minimizing bundle size matters. On a Mac mini with 256GB+ SSD, standard build with full `node_modules` is simpler and avoids the native dep copy problem entirely. **Recommendation: skip standalone, use standard build.**

### Expected Features

See [FEATURES.md](./FEATURES.md) for full details.

**Must have (table stakes):**
- Fix `npm run build` -- nothing else works without this
- PM2 process management with boot persistence
- `HOSTNAME=0.0.0.0` binding for LAN/Tailscale access
- Remote access via Tailscale
- HTTPS via Tailscale MagicDNS (required for PWA service worker)
- Stable SQLite path (absolute, outside project dir)
- Stable photo directory (symlink to persistent storage)
- Environment variable management (.env.production)
- Resolve 11 tech debt items from v1.1 audit

**Should have (differentiators):**
- Cross-AI code review (Gemini 1M-token full-project audit)
- SQLite backup cron job (daily `.backup` command)
- Deploy script (one-command: pull, build, restart)
- PM2 exponential backoff restart + memory limit
- Startup env validation (fail fast on missing vars)
- PM2 log rotation

**Defer to v2.0+:**
- Docker, CI/CD, Cloudflare Tunnel, Litestream, Vercel, cluster mode, auth system, automated Gemini review

### Architecture Approach

The production architecture is minimal by design: PM2 manages a single Next.js process on the Mac mini, SQLite and photos live in a persistent `/data/outland/` directory outside the project, and Tailscale provides encrypted private access from Will's phone. No reverse proxy (Nginx/Caddy) is needed for single-user Tailscale-only access. The app code requires zero changes -- the difference between dev and production is purely configuration (DATABASE_URL, HOSTNAME, NODE_ENV).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

**Major components:**
1. **Next.js production server** -- `next start` via PM2, serves SSR pages, API routes, and static assets
2. **Persistent data layer** -- `/data/outland/outland.db` (SQLite) + `/data/outland/photos/` (symlinked from `public/photos`)
3. **PM2 process manager** -- ecosystem.config.cjs with fork mode, memory limit, log rotation, boot persistence
4. **Tailscale VPN** -- encrypted mesh network between Mac mini and iPhone, MagicDNS for HTTPS

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full details.

1. **Native deps break `npm run build`** -- Audit import chains to ensure no client component transitively imports better-sqlite3/sqlite-vec. Add `import 'server-only'` guards. Pin Node.js to 20/22 LTS.
2. **Photos in `public/` lost on redeploy** -- Symlink `public/photos` to `/data/outland/photos/`. Zero code changes, one line in deploy script.
3. **Relative DATABASE_URL creates empty DB** -- Use absolute path `file:/data/outland/outland.db` in production env. Verify data persists across PM2 restarts.
4. **PM2 watch mode + SQLite = restart loop** -- Set `watch: false` in ecosystem.config. SQLite WAL file changes and photo uploads trigger filesystem events.
5. **No auth + public tunnel = full data exposure** -- Use Tailscale (private mesh), never expose raw port via Cloudflare Tunnel without Cloudflare Access auth layer.

## Implications for Roadmap

Based on research, suggested phase structure (4 phases):

### Phase 1: Fix the Build + Tech Debt Cleanup

**Rationale:** The `npm run build` failure is the single blocker for everything else. Tech debt items are independent and can be resolved in parallel.
**Delivers:** A working production build; clean codebase baseline
**Addresses:** Build fix (table stakes), 11 tech debt items (table stakes), Node.js version pinning
**Avoids:** Pitfall 1 (native deps break build), tech debt patterns from PITFALLS.md
**Estimated complexity:** Medium -- build fix requires debugging import chains; tech debt items are individually small

### Phase 2: Cross-AI Code Review

**Rationale:** Run Gemini audit while the build is fixed and before deploying to production. Different model catches different blind spots from 25+ sessions of Claude-only development. Findings feed into remaining phases.
**Delivers:** Actionable issue list triaged by severity; confidence that architectural issues are caught before production
**Addresses:** Cross-AI review (differentiator)
**Avoids:** Shipping unreviewed code to production
**Estimated complexity:** Medium -- requires preparing context bundle and triaging findings

### Phase 3: Production Data Layout + PM2 Setup

**Rationale:** With a working build, configure the production environment. Data paths must be set before the app runs in production to avoid the silent empty-database pitfall.
**Delivers:** Running production app on Mac mini, persistent data, auto-restart on crash/reboot
**Addresses:** Stable SQLite path, stable photo directory, .env.production, PM2 config, boot persistence, log rotation, deploy script, SQLite backup cron
**Avoids:** Pitfall 2 (photos lost), Pitfall 3 (database path breaks), Pitfall 4 (PM2 watch/memory), Pitfall 7 (cluster mode)
**Estimated complexity:** Low-Medium -- well-documented patterns, mostly configuration

### Phase 4: Remote Access + PWA Verification

**Rationale:** Tailscale is the final layer that makes the app accessible from Will's phone anywhere. HTTPS via MagicDNS is required for PWA service worker functionality.
**Delivers:** Will can access Outland OS from his phone anywhere; PWA install works; offline mode works remotely
**Addresses:** Tailscale setup, HTTPS for service worker, PWA verification, mobile access
**Avoids:** Pitfall 5 (no auth + public exposure)
**Estimated complexity:** Low -- install Tailscale on two devices, verify access

### Phase Ordering Rationale

- Build fix MUST come first -- every other phase depends on a working `npm run build`
- Gemini review before production deploy catches issues while they are cheap to fix
- Data layout before PM2 start prevents the silent empty-database pitfall
- Tailscale last because it is independent of all other work and has the lowest complexity
- Tech debt parallelizes with build fix (different files, no conflicts)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (build fix):** The exact import chain causing the native dep leak needs debugging. Research identified the likely cause but the specific file needs to be traced. Consider `/gsd:research-phase` if the initial fix attempt fails.
- **Phase 2 (Gemini review):** The review prompt structure and context bundle preparation may benefit from research into effective multi-model review prompts.

Phases with standard patterns (skip research-phase):
- **Phase 3 (PM2 + data layout):** Extremely well-documented. PM2 ecosystem config, symlinks, absolute paths, cron jobs -- all standard ops.
- **Phase 4 (Tailscale):** Install app on two devices, done. Zero ambiguity.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Next.js docs, PM2 docs, Tailscale docs all directly applicable. No exotic technologies. |
| Features | HIGH | Clear table stakes / differentiator / anti-feature separation. Feature list is small and well-scoped. |
| Architecture | HIGH | Single-app single-user deployment is the simplest possible case. One divergence (standalone vs standard build) resolved in favor of simplicity. |
| Pitfalls | HIGH | All pitfalls verified against official docs, GitHub issues, and community reports. The build failure is already observed in the project. |

**Overall confidence:** HIGH

### Gaps to Address

- **Build failure root cause:** Research identifies the likely cause (client-side import leakage of native modules) but the specific file/import chain has not been traced. This needs hands-on debugging in Phase 1.
- **Standalone vs standard build:** STACK.md and ARCHITECTURE.md disagree. This summary recommends standard build, but if disk space or deployment atomicity becomes important later, standalone can be revisited.
- **HTTPS for local WiFi:** Tailscale MagicDNS provides HTTPS over the tailnet, but if Will wants HTTPS on local WiFi without Tailscale active, Caddy would be needed. Deferred unless Will raises it.
- **Service worker cache versioning:** The current SW uses a static cache name (`outland-shell-v1`). The deploy script should increment this, but the mechanism (manual bump vs build hash) is not decided.

## Sources

### Primary (HIGH confidence)
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js output configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Tailscale Getting Started](https://tailscale.com/kb/1017/install)
- [Tailscale Pricing](https://tailscale.com/pricing)

### Secondary (MEDIUM confidence)
- [Tailscale vs Cloudflare Tunnel comparison](https://www.lowerhomeserver.vip/blog/optimization/tailscale-vs-cloudflare-tunnel)
- [Multi-Model AI Code Review](https://zylos.ai/research/2026-02-17-multi-model-ai-code-review)
- [Self-hosting Next.js with PM2](https://www.headystack.com/self-host-nextjs)
- [Gemini CLI Code Analysis Codelab](https://codelabs.developers.google.com/gemini-cli-code-analysis)
- [better-sqlite3 Node 25 build failure](https://github.com/WiseLibs/better-sqlite3/issues/1411)

### Tertiary (LOW confidence)
- [PM2 memory leak report](https://github.com/Unitech/pm2/issues/4510) -- known issue, mitigated by max_memory_restart config

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
