# Technology Stack — v1.2 Ship It (Deployment & Tech Debt)

**Project:** Outland OS
**Researched:** 2026-04-02
**Focus:** Self-hosting on Mac mini, remote access, production build fixes
**Scope:** NEW additions only. Existing stack (Next.js 16, Prisma, SQLite, etc.) is validated and not re-researched.

## Recommended Stack Additions

### Process Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PM2 | 6.x (latest: ~6.0.14) | Node.js process manager | Auto-restart on crash, startup persistence across reboots, log rotation, zero-config for fork mode. Industry standard for self-hosted Node.js. |

**Why PM2 over alternatives:**
- **vs systemd:** PM2 is Node-aware (monitors event loop, memory), provides `pm2 logs`, `pm2 monit`, and ecosystem.config.js for declarative config. systemd works but requires manual log setup and no Node-specific monitoring.
- **vs Docker:** Overkill for a single-user app on a Mac mini. Adds container overhead, complicates SQLite file access and photo storage. Docker is for when you need reproducible deploys across environments — Will has one Mac mini.
- **vs forever:** Abandoned/unmaintained. PM2 is actively maintained with 40k+ GitHub stars.

**Critical config:** Use `fork` mode (not `cluster`). Next.js manages its own internal workers; cluster mode causes port conflicts.

**Installation:**
```bash
npm install -g pm2
```

### Remote Access

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailscale | Latest (auto-updates) | Encrypted mesh VPN for remote access | Zero-config networking, WireGuard-based, works behind CGNAT/carrier NAT, free Personal plan (100 devices, 3 users), no port forwarding needed, no exposed ports. |

**Why Tailscale over Cloudflare Tunnel:**
- **Use case fit:** Will needs *private* access from his phone to his Mac mini. Not public access. Tailscale is purpose-built for this — it creates a private encrypted network between his devices.
- **Simplicity:** Install on Mac mini + phone. Done. No DNS config, no domain purchase, no TLS certificates, no cloudflared daemon config.
- **Performance:** Direct WireGuard connections add 5-15ms latency (peer-to-peer when possible). Cloudflare routes all traffic through their edge, adding variable latency.
- **Privacy:** Traffic never passes through Tailscale servers in decrypted form. Cloudflare terminates TLS and inspects traffic at their edge.
- **No public exposure:** Mac mini stays invisible to the internet. Cloudflare Tunnel exposes services publicly by design.

**When to reconsider Cloudflare Tunnel:** If Will ever needs to share a public URL (e.g., live location sharing in v2.0+). Cloudflare Tunnel is better for public-facing services. Can layer it on later without removing Tailscale.

**Free plan limits:** 100 devices, 3 users — more than sufficient for single-user personal tool.

### Production Build Configuration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js `output: 'standalone'` | (built-in to Next.js 16) | Minimal production build | Creates self-contained `.next/standalone/` with only needed files + minimal `node_modules`. ~50MB vs ~300MB full install. Includes `server.js` entry point. |

**Why standalone output:**
- PM2 runs `node .next/standalone/server.js` directly — no `npm start` wrapper needed
- Drastically smaller deployment footprint
- Native modules (better-sqlite3, sqlite-vec) get copied into standalone `node_modules` automatically when listed in `serverExternalPackages`
- Standard self-hosting pattern recommended by Next.js docs

## Native SQLite Build Fix

### The Problem

`npm run build` fails because `better-sqlite3` and `sqlite-vec` are native Node.js modules (C++ bindings compiled with `node-gyp`). Next.js webpack bundler tries to bundle them and fails on the native `.node` binary files.

### Current Mitigation (Partial)

```typescript
// next.config.ts — already present
serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
```

This tells Next.js to `require()` these at runtime instead of bundling them. This is correct and necessary.

### What's Likely Still Broken

The `serverExternalPackages` config should work for the production build. The remaining build failure is likely one of:

1. **Client-side import leakage:** If any client component (or shared module imported by a client component) transitively imports `lib/rag/db.ts`, webpack will try to resolve `better-sqlite3` for the client bundle. The dynamic `import()` in `getVecDb()` helps but may not fully prevent static analysis.

2. **Missing native binary:** The `.node` file for better-sqlite3 or sqlite-vec may not be compiled for the build machine's platform/architecture. Run `npm rebuild better-sqlite3` after `npm install`.

3. **Next.js 16.1 transitive dep fix:** Next.js 16.1 fixed transitive dependency resolution for `serverExternalPackages` with Turbopack. If the build uses Turbopack, ensure Next.js is at 16.1+. Current version is 16.2.1 — should be fine.

### Fix Strategy (Confidence: HIGH)

```typescript
// next.config.ts — add standalone output
const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
  // ... existing headers config
};
```

Then verify:
1. No client component imports from `lib/rag/` (grep for imports)
2. `npm rebuild better-sqlite3 sqlite-vec` before build
3. `npm run build` succeeds
4. `node .next/standalone/server.js` starts correctly

If client-side import leakage exists, fix with conditional dynamic imports or by splitting the RAG module so server-only code is in a separate file that no client component can reach.

## Deployment Architecture

### Files and Directories

```
Mac mini (production)
├── ~/outland-os/                    # App root (git clone)
│   ├── .next/standalone/            # Production build output
│   │   ├── server.js                # Entry point for PM2
│   │   └── node_modules/            # Minimal, auto-traced
│   ├── .next/static/                # Static assets (must be copied)
│   ├── public/                      # Static files + uploaded photos
│   ├── prisma/dev.db                # SQLite database
│   └── ecosystem.config.js          # PM2 configuration
├── Tailscale                        # VPN daemon (system service)
└── PM2                              # Process manager (global)
```

### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'outland-os',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',           // Listen on all interfaces (needed for Tailscale)
      DATABASE_URL: 'file:./prisma/dev.db',
      ANTHROPIC_API_KEY: '...',       // From .env, not committed
    },
    instances: 1,                     // Fork mode (NOT cluster)
    exec_mode: 'fork',
    autorestart: true,
    watch: false,                     // No file watching in production
    max_memory_restart: '512M',       // Restart if memory exceeds 512MB
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

### PM2 Startup Persistence

```bash
# After first pm2 start:
pm2 start ecosystem.config.js
pm2 save                            # Save process list
pm2 startup                         # Generate OS startup script
# Follow the printed command (sudo ...) to install the launchd plist on macOS
```

### Tailscale Access Pattern

```
Will's iPhone (Tailscale app)
  └── 100.x.y.z:3000  ─── Tailscale VPN tunnel ──→  Mac mini (100.a.b.c:3000)
                                                        └── PM2 → Next.js server
```

- Mac mini gets a stable Tailscale IP (100.x.x.x) + MagicDNS hostname (e.g., `mac-mini.tail12345.ts.net`)
- Will bookmarks `http://mac-mini:3000` on his phone
- No HTTPS needed over Tailscale (already encrypted end-to-end via WireGuard)
- No Nginx/reverse proxy needed (single app, single user, no TLS termination needed)

## What NOT to Add

| Technology | Why Not |
|------------|---------|
| Nginx / Caddy | Unnecessary reverse proxy for single-user app. PM2 + Tailscale handles everything. Add only if multiple services share the Mac mini later. |
| Docker | Adds complexity, complicates SQLite file access and photo storage, overkill for single deployment target. |
| HTTPS / Let's Encrypt | Tailscale provides end-to-end WireGuard encryption. HTTP over Tailscale is already encrypted. |
| Cloudflare Tunnel | Designed for public exposure. Will needs private access. Tailscale is simpler and more secure for this use case. |
| systemd / launchd (direct) | PM2 handles startup persistence via `pm2 startup` which generates a launchd plist. No need to write one manually. |
| Cluster mode (PM2) | Next.js manages its own workers. Cluster mode causes port conflicts. Fork mode with `instances: 1` is correct. |
| Database migration to Postgres | SQLite works fine for single user. Mac mini deployment eliminates the Vercel/serverless SQLite limitation. Revisit only if data exceeds ~10GB or concurrent access becomes an issue (it won't for single user). |
| Redis / caching layer | No concurrent users. SQLite with WAL mode handles single-user reads/writes efficiently. |
| CI/CD pipeline | Single developer, single deployment target. `git pull && npm run build && pm2 restart` is the deploy workflow. |
| Monitoring (Datadog, etc.) | `pm2 monit` and `pm2 logs` are sufficient for a personal tool. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Process manager | PM2 | systemd / launchd | PM2 is Node-aware, provides logs/monitoring, easier config |
| Remote access | Tailscale | Cloudflare Tunnel | Will needs private access, not public. Tailscale is simpler. |
| Remote access | Tailscale | WireGuard (manual) | Tailscale IS WireGuard with zero-config coordination. Manual WireGuard requires key management, IP allocation, firewall rules. |
| Build output | Standalone | Default (`next start`) | Standalone is smaller, self-contained, PM2-friendly |
| Reverse proxy | None | Nginx | Unnecessary layer for single-user Tailscale-only access |

## Installation Summary

### On Mac mini (one-time setup)

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Install Tailscale
# Download from https://tailscale.com/download/mac or:
brew install tailscale
tailscale up  # Authenticate with Tailscale account

# 3. Clone and build
git clone <repo> ~/outland-os
cd ~/outland-os
npm install
npm rebuild better-sqlite3 sqlite-vec  # Ensure native binaries match platform
npx prisma migrate deploy              # Apply migrations (production command)
npm run build                           # Creates .next/standalone/

# 4. Copy static assets to standalone (Next.js requirement)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow printed instructions

# 6. Install PM2 log rotation
pm2 install pm2-logrotate
```

### On Will's iPhone

1. Install Tailscale from App Store
2. Log in with same Tailscale account
3. Bookmark `http://mac-mini:3000` (MagicDNS) or `http://100.x.x.x:3000`
4. PWA "Add to Home Screen" for app-like experience

### Deploy Updates

```bash
cd ~/outland-os
git pull
npm install
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart outland-os
```

This could be scripted into a `deploy.sh` for convenience.

## Confidence Assessment

| Decision | Confidence | Basis |
|----------|-----------|-------|
| PM2 for process management | HIGH | Official Next.js self-hosting docs, widespread adoption, verified PM2 6.x active |
| Tailscale for remote access | HIGH | Perfect use-case fit (private, single-user), free tier sufficient, WireGuard-based |
| `output: 'standalone'` | HIGH | Next.js official self-hosting recommendation, verified in docs |
| `serverExternalPackages` for native deps | HIGH | Already partially configured, Next.js 16.2.1 has transitive dep fix |
| No Nginx needed | MEDIUM | Correct for Tailscale-only access, but may need Nginx if services grow |
| Build fix (native SQLite) | MEDIUM | Root cause identified (client-side import leakage likely), fix strategy clear but needs debugging to confirm |
| No HTTPS needed | HIGH | Tailscale provides WireGuard encryption — HTTP over Tailscale is already encrypted |

## Sources

- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js output config](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Tailscale Pricing](https://tailscale.com/pricing)
- [Tailscale vs Cloudflare Tunnel comparison](https://www.lowerhomeserver.vip/blog/optimization/tailscale-vs-cloudflare-tunnel)
- [Secure Remote Access: Tailscale vs WireGuard vs Cloudflare (2026)](https://www.lowerhomeserver.vip/blog/use-cases/secure-remote-access-comparison)
- [Next.js + PM2 Discussion](https://github.com/vercel/next.js/discussions/31461)
- [Deploying Next.js with PM2 (Mar 2026)](https://medium.com/@touhidulislamnl/deploying-a-next-js-app-on-a-vps-with-nginx-pm2-and-https-complete-production-guide-5b2d80c24dd4)
- [PM2 Guide (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/pm2-guide/)
