# Phase 15: Remote Access & Go Live - Research

**Researched:** 2026-04-03
**Domain:** Tailscale VPN, `tailscale serve`, HTTPS/TLS, PWA service worker requirements
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `tailscale serve` for HTTPS. One command proxies TLS from Tailscale's CA to the local app. No reverse proxy needed.
- **D-02:** Do NOT configure Next.js to serve HTTPS directly — keep it on localhost:3000.
- **D-03:** Basic Tailscale install only: Mac mini + MagicDNS + `tailscale serve`. No ACLs, no exit node, no subnet routing.
- **D-04:** Tailscale install on Will's iPhone is part of this phase (ACCESS-02), but is a manual step (App Store install + login).
- **D-05:** Phase 15 starts with app already running at localhost:3000 managed by PM2. Phase 15 does NOT touch Phase 14 infrastructure.
- **D-06:** Tailscale installation on the Mac mini is Phase 15 work (not Phase 14).
- **D-07:** Done = full PWA flow from phone: connect via MagicDNS, verify HTTPS, install to home screen, test offline mode.

### Claude's Discretion

- MagicDNS hostname format: Tailscale auto-generates — use whatever Tailscale assigns.
- `tailscale serve` persistence: configure to survive reboots.
- Whether to add `tailscale serve` to the deploy script or keep as one-time setup: Claude decides.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCESS-01 | Tailscale installed and running on Mac mini | macOS Standalone pkg install + `tailscale up` login |
| ACCESS-02 | Tailscale installed on Will's iPhone | App Store install + login (manual step, in-scope) |
| ACCESS-03 | MagicDNS provides stable hostname for the app | Enable in admin console DNS page; format: `machine-name.tailnetXXXX.ts.net` |
| ACCESS-04 | HTTPS works via Tailscale (required for PWA service worker) | `tailscale serve --bg --https=443 http://localhost:3000` after enabling HTTPS certs in admin console |
| ACCESS-05 | App is installable as PWA from phone over Tailscale | HTTPS (ACCESS-04) unlocks service worker; existing manifest.ts + sw.js already in place |
</phase_requirements>

---

## Summary

Phase 15 is pure infrastructure — no app code changes expected. The entire phase is: install Tailscale on Mac mini and iPhone, enable MagicDNS + HTTPS certificates in the Tailscale admin console, run one `tailscale serve` command with the `--bg` flag (so it persists across reboots), and verify the full PWA install flow from Will's phone.

The critical finding is that `tailscale serve --bg` stores its configuration persistently inside the Tailscale daemon — no launchd plist, no cron job, no deploy script change needed for persistence. The `--bg` flag is the entire persistence story. When the Mac mini reboots and the Tailscale daemon starts (which itself is handled by a launchd plist installed by Tailscale), serve automatically resumes.

There is one potentially confusing macOS variant issue: the macOS App Store version of Tailscale and the Standalone `.pkg` version both support port proxying (what we need), but the App Store version does NOT support Funnel (public internet sharing — which we do not need). The Standalone `.pkg` from pkgs.tailscale.com is the recommended install for the Mac mini since it gets faster security updates and is not sandboxed.

**Primary recommendation:** Install Tailscale Standalone `.pkg` on Mac mini, enable MagicDNS + HTTPS certs in admin console, run `tailscale serve --bg --https=443 http://localhost:3000` once, install Tailscale on iPhone from App Store, and verify PWA install from phone.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Tailscale | 1.96.x (latest stable) | WireGuard mesh VPN + HTTPS proxy | Private encrypted access with zero config TLS |
| `tailscale serve` | built-in CLI | HTTPS termination proxy | One command; Tailscale CA handles certs; no Nginx/Caddy needed |
| MagicDNS | built-in | Stable hostname resolution | Auto-registers `machine.tailnet.ts.net`; no DNS config needed |
| Tailscale iOS | App Store | iPhone VPN client | Required for iPhone to reach Tailscale network |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Tailscale Admin Console | web UI | Enable HTTPS certs + MagicDNS | One-time setup; must do before `tailscale serve` works |
| `tailscale status` | CLI | Verify connectivity | Smoke test: confirms devices on same tailnet |
| `tailscale serve status` | CLI | Verify serve config | Confirms HTTPS proxy is active and hostname |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tailscale serve` | Caddy + `tailscale cert` | More control, but more config; D-01 is locked against this |
| `tailscale serve` | Nginx + Let's Encrypt | Would require public DNS; explicitly out of scope |
| Tailscale | Cloudflare Tunnel | Public exposure; locked out by D-03 / REQUIREMENTS.md |

**Installation (Mac mini):**
```bash
# Download and install Standalone pkg (NOT App Store)
curl -L https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg -o tailscale.pkg
sudo installer -pkg tailscale.pkg -target /

# OR: download .pkg from https://pkgs.tailscale.com/stable/#macos and open it
```

**Version verification:**
Current stable as of research date: **1.96.5**
Source: https://pkgs.tailscale.com/stable/#macos

---

## Architecture Patterns

### How `tailscale serve` fits the stack

```
iPhone (Tailscale iOS app)
        |
        | WireGuard tunnel (encrypted)
        |
Mac mini:
  [Tailscale daemon] — handles WireGuard + TLS termination
        |
        | HTTPS proxy (cert from Tailscale CA)
        v
  tailscale serve → http://localhost:3000
        |
        v
  PM2 → Next.js (standalone build, port 3000)
        |
        v
  SQLite @ /data/outland/dev.db
```

**Key insight:** `tailscale serve` sits entirely between the WireGuard interface and localhost. Next.js never sees HTTPS — it sees plain HTTP from localhost. The TLS certificate lives in Tailscale's control plane, not in the app.

### Pattern 1: Background Serve with Persistence

**What:** `tailscale serve --bg` stores configuration inside the Tailscale daemon state; no external process manager needed.
**When to use:** Always for production. Foreground mode (without `--bg`) dies when the terminal closes.

```bash
# Source: https://tailscale.com/kb/1242/tailscale-serve
# Run once; persists across reboots automatically
tailscale serve --bg --https=443 http://localhost:3000

# Verify it's running
tailscale serve status

# Expected output:
# https://mac-mini.tailXXXX.ts.net (https://mac-mini.tailXXXX.ts.net)
# |-- / proxy http://127.0.0.1:3000
```

### Pattern 2: Admin Console Setup (prerequisite)

**What:** Two settings in https://login.tailscale.com/admin/dns must be enabled before `tailscale serve` can issue certs.
**Order matters:** MagicDNS must be on before HTTPS certs can be enabled.

Steps:
1. Admin console → DNS → Enable MagicDNS
2. Admin console → DNS → HTTPS Certificates → Enable
3. Acknowledge machine names appear in Certificate Transparency log
4. Back on Mac mini: `tailscale serve --bg --https=443 http://localhost:3000` (auto-obtains cert on first run)

### Pattern 3: MagicDNS Hostname Format

Tailscale assigns: `{machine-name}.{tailnet-name}.ts.net`

Examples: `mac-mini.tail1234ab.ts.net` or `mac-mini.yak-bebop.ts.net`

The tailnet name is shown in the admin console. Machine name comes from the Mac's hostname. Both are stable unless deliberately changed.

### Anti-Patterns to Avoid

- **Running `tailscale serve` without `--bg`:** Config lives only in that terminal session. Reboot loses it. Always use `--bg` for production.
- **Expecting HTTPS at localhost:3000:** Next.js stays plain HTTP. HTTPS termination is 100% Tailscale's job (D-02).
- **Using macOS App Store Tailscale for this:** App Store version supports port proxying but is sandboxed and gets slower security updates. Use Standalone `.pkg` for Mac mini.
- **Confusing Funnel and Serve:** Funnel = public internet exposure (not wanted). Serve = tailnet-only (what we want). Same CLI, different intent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS certificates | Manual Let's Encrypt, self-signed certs | `tailscale serve` (auto cert) | Tailscale CA issues certs automatically; no renewal, no config |
| Reverse proxy | Nginx/Caddy config | `tailscale serve` | Tailscale's built-in proxy is one command |
| VPN connectivity | WireGuard manual setup | Tailscale | Tailscale wraps WireGuard with key management, NAT traversal, MagicDNS |
| Serve persistence | launchd plist for serve | `--bg` flag | Tailscale daemon manages this internally |

**Key insight:** `tailscale serve --bg` replaces the entire reverse-proxy + TLS stack for a private single-user tool. It is not a workaround — it is the designed solution for this use case.

---

## Runtime State Inventory

> This phase has no rename/refactor work. Section included to explicitly confirm no runtime state is affected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing Tailscale config on Mac mini | Install fresh |
| Live service config | None — no existing `tailscale serve` config | One-time setup |
| OS-registered state | None — Tailscale not yet installed on Mac mini (D-06) | Install + `pm2 startup` already handles Mac mini boot |
| Secrets/env vars | Tailscale auth key (optional) — headless install can use `TAILSCALE_AUTHKEY`; interactive login via `tailscale up` is simpler | None required; interactive login preferred |
| Build artifacts | None — no code changes expected | None |

---

## Common Pitfalls

### Pitfall 1: `tailscale serve` Without HTTPS Certs Enabled

**What goes wrong:** Command fails with an error about certificates or HTTPS not being configured for the tailnet.
**Why it happens:** HTTPS cert issuance requires opt-in in the admin console (machine names go in CT log).
**How to avoid:** Enable MagicDNS + HTTPS certs in admin console BEFORE running `tailscale serve`.
**Warning signs:** Error message containing "HTTPS certificates" or "not enabled for this tailnet".

### Pitfall 2: Service Worker Fails to Register Over Tailscale HTTPS

**What goes wrong:** PWA install prompt never appears; service worker silently not registered.
**Why it happens:** Service workers require a "secure context" (HTTPS or localhost). HTTP over a Tailscale MagicDNS URL is NOT a secure context.
**How to avoid:** Ensure `tailscale serve` is correctly providing HTTPS (not HTTP). Verify the browser shows a padlock. The existing sw.js has no origin restrictions so it will work on any HTTPS origin.
**Warning signs:** Chrome DevTools Application tab shows service worker as "redundant" or not listed.

### Pitfall 3: Forgetting `--bg` Flag

**What goes wrong:** `tailscale serve` works during the terminal session but disappears after terminal close or reboot.
**Why it happens:** Foreground mode is the default; closing the terminal terminates the process.
**How to avoid:** Always use `tailscale serve --bg ...`. Verify with `tailscale serve status` after a reboot test.
**Warning signs:** App unreachable from phone after Mac mini sleep/wake cycle; `tailscale serve status` shows empty config.

### Pitfall 4: macOS App Store Tailscale on Mac Mini

**What goes wrong:** `tailscale serve` may have sandbox-limited behavior with the App Store variant.
**Why it happens:** App Store sandbox restrictions; Standalone variant is explicitly recommended for server-like use.
**How to avoid:** Install from Standalone `.pkg` at pkgs.tailscale.com — NOT from Mac App Store. iPhone uses App Store version (correct and expected for iOS).
**Warning signs:** Unexpected errors from `tailscale serve`; update delays for security patches.

### Pitfall 5: PWA Manifest `start_url` Origin Mismatch

**What goes wrong:** PWA installed from Tailscale hostname; on re-open it tries a different origin than expected.
**Why it happens:** If the service worker scope or manifest `start_url` is hardcoded to a specific hostname.
**How to avoid:** Current `manifest.ts` uses `start_url: '/'` (relative) which is correct — it resolves to whatever origin served the manifest. No change needed.
**Warning signs:** Installed PWA opens to wrong URL or shows "site not available".

### Pitfall 6: iPhone Not on Tailscale When Testing

**What goes wrong:** Browser on iPhone can't resolve `machine.tailnet.ts.net`.
**Why it happens:** Tailscale iOS VPN must be connected (toggle in iOS Settings or Tailscale app). It's not always-on unless configured.
**How to avoid:** Ensure Tailscale iOS app is open and connected before testing. Green dot = connected.
**Warning signs:** DNS resolution failure, blank page, or "server not found" error in Safari.

---

## Code Examples

### Verified Commands

```bash
# Source: https://tailscale.com/kb/1242/tailscale-serve

# Install Tailscale on Mac mini (Standalone pkg — NOT App Store)
# Download from https://pkgs.tailscale.com/stable/#macos

# Connect Mac mini to tailnet (interactive, opens browser for auth)
tailscale up

# Enable persistent HTTPS proxy (run once; survives reboots)
tailscale serve --bg --https=443 http://localhost:3000

# Check what's being served
tailscale serve status
# Output example:
# https://mac-mini.tail1234ab.ts.net (https://mac-mini.tail1234ab.ts.net)
# |-- / proxy http://127.0.0.1:3000

# Disable if needed
tailscale serve --https=443 http://localhost:3000 off

# Check all devices on tailnet (confirm iPhone is visible)
tailscale status
```

### Existing PWA Code (no changes needed)

The service worker at `public/sw.js` uses relative URL matching and has no hardcoded origins. The `install` handler caches `SHELL_ASSETS` which are all relative paths. This is correct for any HTTPS hostname.

```javascript
// public/sw.js (existing — no changes needed for Tailscale)
// Source: project codebase
const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings', '/chat']
// All relative — works on https://mac-mini.tail1234ab.ts.net without modification
```

The manifest at `app/manifest.ts` uses `start_url: '/'` (relative). This is correct — no hostname hardcoded.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailscale serve https:443 http://localhost:3000` (old syntax) | `tailscale serve --bg --https=443 http://localhost:3000` | Tailscale v1.52 | New flag-based syntax is current; old positional syntax deprecated |
| Manual cert with `tailscale cert` + Caddy | `tailscale serve` auto-cert | ~2022 | No manual cert management needed |
| Foreground-only serve | `--bg` flag for persistence | Tailscale ~v1.52 | Production deployments no longer need external process managers for serve |

**Deprecated/outdated:**
- `tailscale serve https:443 http://localhost:3000` (colon-style positional syntax): Replaced by `--https=443` flag syntax in v1.52+. Old syntax may still work but new syntax is canonical.

---

## Open Questions

1. **Mac mini's current Tailscale state**
   - What we know: Phase 14 CONTEXT says Tailscale install is Phase 15 work (D-06). Mac mini presumably has no Tailscale.
   - What's unclear: Whether Will has ever installed Tailscale on the Mac mini before (auth state, old config).
   - Recommendation: Plan should include a check/cleanup step: `tailscale status` to see if already installed; if so, `tailscale up` to re-authenticate to the correct account.

2. **Tailscale account / tailnet ownership**
   - What we know: Will needs both Mac mini and iPhone on the same tailnet (same Tailscale account).
   - What's unclear: Whether Will already has a Tailscale account from prior use.
   - Recommendation: Plan should note: use same Tailscale account for both devices. If new account, tailnet name will be auto-generated.

3. **`tailscale serve` and the deploy script (D-discretion)**
   - What we know: `tailscale serve --bg` is self-persisting. It does NOT need to be in the deploy script.
   - Recommendation: Keep `tailscale serve` as a one-time setup step, NOT in the deploy script. The deploy script (`git pull → build → pm2 restart`) doesn't touch Tailscale; serve config persists independently.

---

## Environment Availability

> This phase runs on the Mac mini, not the dev MacBook. Availability is assessed for Mac mini target.

| Dependency | Required By | Available on Mac mini | Fallback |
|------------|------------|----------------------|----------|
| Tailscale CLI | ACCESS-01, ACCESS-03, ACCESS-04 | To be installed (Phase 15) | None — required |
| Tailscale iOS app | ACCESS-02 | To be installed manually (App Store) | None — required |
| MagicDNS (admin console) | ACCESS-03 | Requires admin console toggle | None — required |
| HTTPS Certs (admin console) | ACCESS-04 | Requires admin console toggle | None — required |
| PM2 + localhost:3000 | All ACCESS | Delivered by Phase 14 | Phase 14 is prerequisite |
| Public/sw.js | ACCESS-05 | Already in repo | None needed |
| manifest.ts | ACCESS-05 | Already in repo | None needed |

**Missing dependencies with no fallback:**
- Tailscale not installed on Mac mini: must be installed as Wave 1 of this phase
- Tailscale admin console settings not yet enabled: must be done before `tailscale serve` works

**Missing dependencies with fallback:**
- None with viable alternatives (Nginx/Caddy are explicitly out of scope per REQUIREMENTS.md)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 1.x (jsdom environment) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` (or `npx vitest run`) |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

Phase 15 is **100% infrastructure** — no app code changes. All acceptance criteria are verified manually by the human on real hardware with a real iPhone. Automated tests are not applicable for network/VPN/device checks.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACCESS-01 | Tailscale installed + running on Mac mini | manual | `tailscale status` (CLI, not Vitest) | N/A |
| ACCESS-02 | Tailscale on iPhone, connected to same tailnet | manual | Visual verification | N/A |
| ACCESS-03 | MagicDNS hostname resolves | manual | `tailscale serve status` shows URL | N/A |
| ACCESS-04 | HTTPS works (browser shows padlock) | manual | Safari on iPhone, visit `https://[hostname].ts.net` | N/A |
| ACCESS-05 | PWA installable from phone | manual | Safari "Add to Home Screen" prompt appears | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run` (existing test suite — confirms no regressions from any incidental code changes)
- **Per wave merge:** `npx vitest run` (same)
- **Phase gate:** Full PWA flow smoke test from iPhone (manual, per D-07)

### Wave 0 Gaps

None — existing test infrastructure covers all automated requirements. Phase 15 has no new code to test.

---

## Sources

### Primary (HIGH confidence)
- [tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve) — serve command syntax, `--bg` flag, persistence behavior, disable syntax
- [tailscale.com/kb/1153/enabling-https](https://tailscale.com/kb/1153/enabling-https) — admin console HTTPS cert setup, MagicDNS hostname format
- [tailscale.com/kb/1065/macos-variants](https://tailscale.com/kb/1065/macos-variants) — macOS App Store vs. Standalone variant differences, Serve support matrix

### Secondary (MEDIUM confidence)
- [pkgs.tailscale.com/stable/#macos](https://pkgs.tailscale.com/stable/#macos) — current macOS package version (1.96.5 verified)
- [tailscale.com/kb/1313/serve-examples](https://tailscale.com/kb/1313/serve-examples) — serve examples including `--bg` usage
- [tailscale.com/blog/reintroducing-serve-funnel](https://tailscale.com/blog/reintroducing-serve-funnel) — v1.52 syntax change (positional → flag-based)
- MDN Web Docs / Next.js PWA guide — HTTPS required for service worker secure context

### Tertiary (LOW confidence)
- GitHub issue [tailscale/tailscale#14523](https://github.com/tailscale/tailscale/issues/14523) — macOS boot persistence discussion; confirms `--bg` is the right path
- Community reports confirm App Store version has sandbox limitations that make Standalone preferred for server deployments

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Tailscale docs; current package version confirmed
- Architecture: HIGH — `tailscale serve` proxy pattern is official documented use case
- Pitfalls: HIGH for items 1-4 (from official docs); MEDIUM for items 5-6 (derived from web standards + community reports)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (Tailscale CLI is stable; `tailscale serve` syntax settled since v1.52)
