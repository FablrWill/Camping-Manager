# Feature Landscape

**Domain:** Self-hosted Next.js PWA production deployment + cross-AI code review
**Researched:** 2026-04-02
**Milestone:** v1.2 Ship It
**Confidence:** HIGH (well-documented patterns, official Next.js docs, established tooling)

---

## Scope

This document covers features for v1.2 "Ship It" -- production deployment on a Mac mini, remote access, and cross-AI code review. The existing feature set (gear, trips, maps, AI packing/meals/checklists, PWA, offline, learning loop, voice debrief) is **already built** across v1.0 and v1.1. The 11 tech debt items from the v1.1 audit are included as prerequisite work.

Three areas:
1. **Production Build & Deploy** -- get `npm run build` working, standalone output, PM2 process management
2. **Remote Access & HTTPS** -- Tailscale mesh VPN, HTTPS for PWA service worker, phone access from anywhere
3. **Cross-AI Code Review** -- Gemini full-project audit to catch Claude's blind spots before shipping

---

## Table Stakes

Features required for a working self-hosted production deployment. Missing any of these means the app is not reliably usable from Will's phone.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Fix `npm run build` | Nothing else works without a successful build | Medium | RAG native deps (better-sqlite3, sqlite-vec) must be resolved | Pre-existing tech debt from Phase 3; either fix native bindings or conditionally import RAG modules |
| `output: 'standalone'` in next.config.ts | Official Next.js self-hosting mode; produces minimal deployable .next/standalone with server.js | Low | next.config.ts one-line addition | Must manually copy public/ and .next/static/ into standalone dir |
| PM2 process manager | Keeps app alive on crash, auto-restart on Mac mini reboot | Low | PM2 global install, ecosystem.config.js | `pm2 startup` + `pm2 save` persists across reboots; single instance only (SQLite constraint) |
| `HOSTNAME=0.0.0.0` binding | App must be reachable from LAN, not just localhost | Low | Environment variable in PM2 config or .env.production | Default Next.js binds to 127.0.0.1 only |
| Remote access via Tailscale | Will needs phone access from anywhere, not just home WiFi | Low | Tailscale installed on Mac mini + phone | Mesh VPN: no port forwarding, no exposed ports, 5-15ms added latency, free for personal use |
| HTTPS for PWA service worker | Service workers require HTTPS; PWA install prompt requires secure context | Medium | Tailscale MagicDNS provides automatic HTTPS certs | Without HTTPS the PWA features built in v1.1 (offline, "Leaving Now") break entirely on remote access |
| Stable SQLite file path | Database must survive redeploys; standalone output relocates files | Low | Absolute path in DATABASE_URL, outside .next/standalone/ | e.g., `file:/Users/willis/outland-os-data/dev.db` |
| Stable photo directory | Uploaded photos in public/photos/ must survive redeploys | Low | Symlink or absolute path outside standalone dir | Standalone output does not copy public/ by default; need a persistent photos directory |
| Environment variable management | API keys and config must be set for production | Low | .env.production file or PM2 env block | ANTHROPIC_API_KEY, DATABASE_URL, GMAIL SMTP creds for float plans, NODE_ENV=production |
| Resolve 11 tech debt items | Clean baseline before shipping; includes UI bugs, test stubs, doc inconsistencies | Medium | See v1.1-MILESTONE-AUDIT.md | Parallelizable with build fix work |

## Differentiators

Features that elevate the deployment from "it runs" to "it runs well." Not blocking launch but significantly improve reliability and developer experience.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Cross-AI code review (Gemini audit) | Gemini's 1M-token context reviews the entire codebase at once; different training catches different blind spots than Claude | Medium | Gemini CLI or Google AI Studio; structured review prompt | One-time pre-deploy audit, not ongoing; creates actionable task list |
| SQLite backup cron job | Protect 25+ sessions of trip data, gear inventory, feedback history from corruption | Low | Simple cron: `sqlite3 dev.db ".backup backup.db"` daily | Litestream is overkill for single-user local; Time Machine helps but DB-specific backup is safer |
| PM2 exponential backoff restart | Smarter restart on repeated crashes (avoids restart storm that hammers SQLite) | Low | One config line: `exp_backoff_restart_delay: 100` in ecosystem.config.js | Built into PM2, no extra dependencies |
| PM2 memory limit restart | Auto-restart if memory exceeds threshold; prevents OOM on shared Mac mini | Low | `max_memory_restart: '512M'` in ecosystem.config.js | Mac mini runs other things; prevent this app from consuming all RAM |
| Deploy script | One-command deploy: pull, build, restart | Low | Shell script on Mac mini | `git pull && npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && pm2 restart outland-os` |
| Startup env validation | Verify required env vars and DB file exist before app starts | Low | Check in instrumentation.ts or a prestart script | Fail fast with clear error instead of cryptic runtime crash |
| PM2 log rotation | Prevent disk fill from accumulated logs | Low | `pm2 install pm2-logrotate` | One-time setup, fire and forget |
| Caddy reverse proxy (optional) | Automatic HTTPS for local network access without Tailscale; clean URL routing | Low-Med | Caddy install + Caddyfile | Only needed if Will wants HTTPS on local WiFi without Tailscale; Tailscale MagicDNS covers remote access |

## Anti-Features

Features to explicitly NOT build for v1.2. Each has a clear reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Docker containerization | Adds learning wall for no benefit on a single Mac mini; SQLite volume mounts are fiddly; Will is learning to code, not DevOps | Run standalone Next.js directly with PM2 |
| Nginx reverse proxy | Configuration complexity disproportionate to single-app single-user setup; Caddy or Tailscale HTTPS is far simpler | Tailscale MagicDNS for HTTPS (zero config), or Caddy if local network HTTPS needed |
| CI/CD pipeline (GitHub Actions) | One developer, one server, infrequent deploys; automated pipeline is premature abstraction | Shell script: `git pull && npm run build && pm2 restart` |
| Cloudflare Tunnel | Requires domain purchase, DNS configuration, routes all traffic through Cloudflare (higher latency); Tailscale is simpler for personal single-user | Tailscale: install on both devices, done; free for 100 devices |
| Multi-process PM2 cluster mode | SQLite cannot handle concurrent writes from multiple Node.js processes; cluster mode will corrupt the database | Run `instances: 1` always; SQLite is the constraint |
| Automated Gemini review on every commit | Overkill for solo dev project; API costs for no incremental benefit | Run Gemini audit once before v1.2 ship, create task list, move on |
| Litestream continuous replication | Designed for multi-server cloud deployments; Mac mini already has Time Machine | Simple cron `sqlite3 .backup` daily is sufficient |
| Auth / login system | Single user, accessed via Tailscale which authenticates at the network level | Tailscale device auth is the auth layer; no app-level auth needed |
| Vercel deployment | Adds cloud hosting costs, complicates SQLite (needs migration to Postgres), loses local photo storage | Mac mini self-hosting is free, keeps SQLite local, photos on disk |
| HTTPS via Let's Encrypt + Certbot | Requires a public domain and port 80/443 open to the internet; unnecessary exposure | Tailscale MagicDNS provides automatic certs within the tailnet |

---

## Feature Dependencies

```
Fix npm run build
    |
    v
output: 'standalone' in next.config.ts
    |
    v
Stable paths (SQLite + photos)  ──>  .env.production
    |                                      |
    v                                      v
PM2 ecosystem.config.js  <────────  Env var config
    |
    v
pm2 startup + pm2 save
    |
    ├──> Deploy script (git pull + build + restart)
    |
    v
Tailscale install (Mac mini + phone)
    |
    v
HTTPS via Tailscale MagicDNS
    |
    v
PWA works remotely (service worker + install prompt)


Resolve 11 tech debt items  ──>  Cross-AI review (Gemini)  ──>  Address findings  ──>  Ship
                                       (runs in parallel with deploy setup)
```

**Critical path:** Build fix -> Standalone -> Paths -> PM2 -> Tailscale -> HTTPS -> PWA verified -> Ship

**Parallel track:** Tech debt resolution + Gemini audit (independent of deploy infrastructure)

---

## Cross-AI Code Review Workflow

### Why Gemini for the Audit

Claude built this entire codebase across 25+ sessions. Claude's systematic assumptions, patterns, and blind spots are baked into every file. A different model (Gemini), trained on different data with different architecture, has **uncorrelated blind spots**. Research shows multi-model review catches 3-5x more issues than single-model review because the intersection of both models' miss rates is substantially smaller than either alone.

Gemini 2.5 Pro's 1M-token context window can ingest the entire Outland OS codebase (~56K LOC across app + tests) in a single pass, enabling whole-project architectural analysis that per-file review tools miss.

### Workflow Steps

**Step 1: Prepare context bundle**
- Project tree listing
- CLAUDE.md (project instructions, conventions, architecture)
- prisma/schema.prisma (data model)
- Key entry points: app/page.tsx, app/api/ routes, lib/ utilities
- next.config.ts, package.json
- A structured review prompt with categories

**Step 2: Run Gemini review**
Feed the bundle to Gemini 2.5 Pro. Review categories:
- **Code quality:** TypeScript patterns, dead code, inconsistencies
- **Architecture:** Component boundaries, data flow, coupling
- **Security:** Env var handling, input validation, API route protection
- **UX/Accessibility:** Mobile usability, ARIA labels, color contrast
- **Performance:** Bundle size, unnecessary re-renders, N+1 queries, missing indexes
- **Testing gaps:** Untested paths, low-value tests, missing edge cases

**Step 3: Triage findings**
Sort by severity: CRITICAL (blocks ship) / HIGH (should fix) / MEDIUM (nice to fix) / LOW (note for later)

**Step 4: Create task list**
Actionable items added to v1.2 roadmap phases

**Step 5: Claude fixes the issues**
Claude addresses the findings Gemini identified -- cross-pollination of AI perspectives

**Step 6: Optional re-review**
Run Gemini again on critical fixes if the initial audit found architectural issues

### Gemini Access Options

| Method | Context | Cost | Recommendation |
|--------|---------|------|----------------|
| Gemini CLI (`gemini` command) | 1M tokens | Free tier available | Best for v1.2 -- scriptable, local |
| Google AI Studio (web UI) | 1M tokens | Free tier | Good for interactive exploration of findings |
| Gemini Code Assist (GitHub) | Per-PR | Free for individuals | Not useful here -- we want full-project audit, not PR review |

**Use Gemini CLI or AI Studio.** No API integration needed. This is a one-time audit, not an ongoing workflow.

---

## MVP Recommendation

### Phase 1: Make It Build
1. Fix `npm run build` -- resolve RAG native dependency issue (conditionally import or remove unused RAG modules)
2. Add `output: 'standalone'` to next.config.ts
3. Resolve 11 tech debt items (parallelize with build fix)

### Phase 2: Cross-AI Review
4. Run Gemini full-project audit
5. Triage findings into CRITICAL/HIGH/MEDIUM/LOW
6. Address CRITICAL and HIGH findings

### Phase 3: Production Deploy
7. Create ecosystem.config.js for PM2 (single instance, env vars, memory limit, backoff)
8. Configure stable SQLite path and photo directory
9. Create .env.production
10. Deploy to Mac mini, verify with `pm2 start`
11. Set up `pm2 startup` + `pm2 save` for reboot persistence

### Phase 4: Remote Access
12. Install Tailscale on Mac mini and phone
13. Verify HTTPS works via Tailscale MagicDNS
14. Test PWA install + offline mode over Tailscale from phone
15. Create deploy script for future updates
16. Set up SQLite backup cron job

**Defer to v2.0+:** Docker, CI/CD, Cloudflare Tunnel, Litestream, Vercel, cluster mode, auth system, automated Gemini review

---

## Sources

- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) -- Official docs on standalone output, env vars, caching (HIGH confidence)
- [Next.js output: standalone config](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) -- Config reference (HIGH confidence)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/) -- PM2 config reference (HIGH confidence)
- [PM2 Restart Strategies](https://pm2.keymetrics.io/docs/usage/restart-strategies/) -- Exponential backoff, memory limits (HIGH confidence)
- [Tailscale vs Cloudflare Tunnel](https://www.lowerhomeserver.vip/blog/optimization/tailscale-vs-cloudflare-tunnel) -- Remote access comparison (MEDIUM confidence)
- [Secure Remote Access 2026](https://www.lowerhomeserver.vip/blog/use-cases/secure-remote-access-comparison) -- Tailscale vs WireGuard vs Cloudflare (MEDIUM confidence)
- [Multi-Model AI Code Review](https://zylos.ai/research/2026-02-17-multi-model-ai-code-review) -- Cross-model review catches 3-5x more issues (MEDIUM confidence)
- [Gemini CLI Code Analysis Codelab](https://codelabs.developers.google.com/gemini-cli-code-analysis) -- Hands-on Gemini CLI review workflow (HIGH confidence)
- [Gemini Code Assist Docs](https://developers.google.com/gemini-code-assist/docs/review-repo-code) -- Gemini review capabilities (HIGH confidence)
- [Cross-Provider AI Review](https://www.mindstudio.ai/blog/openai-codex-plugin-claude-code-cross-provider-review) -- Why different models catch different bugs (MEDIUM confidence)
- [Self-hosting Next.js with PM2](https://www.headystack.com/self-host-nextjs) -- Community deployment guide (MEDIUM confidence)
- [Next.js + PM2 production guide (March 2026)](https://medium.com/@touhidulislamnl/deploying-a-next-js-app-on-a-vps-with-nginx-pm2-and-https-complete-production-guide-5b2d80c24dd4) -- Recent deployment walkthrough (MEDIUM confidence)
- [Litestream SQLite backups](https://medium.com/@cosmicray001/going-production-ready-with-sqlite-how-litestream-makes-it-possible-74f894fc96f0) -- Why simple cron backup is sufficient for single-user (MEDIUM confidence)

---

*Feature research for: Outland OS v1.2 Ship It -- production deployment, remote access, cross-AI review*
*Researched: 2026-04-02*
