# Phase 15: Remote Access & Go Live - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Tailscale on the Mac mini and Will's iPhone, configure `tailscale serve` to provide HTTPS access via MagicDNS, and verify the full PWA flow from Will's phone over the remote connection. Phase 14 is the prerequisite — Phase 15 starts with the app already running at `localhost:3000`.

</domain>

<decisions>
## Implementation Decisions

### HTTPS / TLS
- **D-01:** Use `tailscale serve` for HTTPS. One command (`tailscale serve https:443 http://localhost:3000`) proxies TLS from Tailscale's CA to the local app. No reverse proxy (Caddy, Nginx) needed. Fits the existing "PM2 only, no extra servers" philosophy.
- **D-02:** Do NOT configure Next.js to serve HTTPS directly — keep it serving plain HTTP on localhost:3000 as Phase 14 delivers it.

### Tailscale Configuration
- **D-03:** Basic install only: Tailscale on Mac mini + MagicDNS hostname + `tailscale serve`. No ACLs, no exit node, no subnet routing. Single-user personal tool — simplicity wins.
- **D-04:** Tailscale install on Will's iPhone is part of this phase (ACCESS-02), but is a manual step (App Store install + login).

### Phase 14 Handoff Assumption
- **D-05:** Phase 15 assumes Phase 14 has delivered: app running in production mode at `localhost:3000`, PM2 managing it, data persisted at `/data/outland/`. Phase 15 does NOT touch Phase 14 infrastructure — it adds remote access on top.
- **D-06:** Tailscale installation on the Mac mini is Phase 15 work, not Phase 14.

### Go-Live Verification
- **D-07:** "Done" = full PWA flow from Will's phone: connect via Tailscale MagicDNS, verify HTTPS works, install app to home screen, test that offline mode works over the connection. Real-world smoke test, not just a ping check.

### Claude's Discretion
- MagicDNS hostname format: Tailscale auto-generates this — Claude picks whatever Tailscale assigns (no specific name required).
- `tailscale serve` persistence: configure it to survive reboots (platform-dependent detail — Claude handles).
- Whether to add `tailscale serve` to the deploy script or keep it as a one-time setup: Claude decides what's more maintainable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ACCESS-01 through ACCESS-05 acceptance criteria

### Phase Context
- `.planning/ROADMAP.md` — Phase 15 success criteria, dependency on Phase 14
- `.planning/phases/14-production-deployment/14-CONTEXT.md` — Phase 14 decisions (what Phase 15 inherits)

### Project Context
- `.planning/PROJECT.md` — Tech stack (PM2, no Docker/Nginx, Mac mini target), production setup details

No external specs — Tailscale official docs are the authoritative reference for install/serve commands (agents should check tailscale.com docs for current CLI syntax).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Service worker already implemented (Phase 8/10) — offline mode is built. Phase 15 just verifies it works over Tailscale HTTPS.
- PWA manifest already in place — installable from browser. Phase 15 verifies the install works from phone.

### Established Patterns
- No code changes expected in Phase 15 — this is infrastructure + ops, not app code.
- If service worker needs `HTTPS` origin updates for the MagicDNS hostname, that's the only potential code touch.

### Integration Points
- `localhost:3000` → `tailscale serve` → `https://[hostname].ts.net` is the full path
- Phase 14's PM2 config keeps `localhost:3000` running; Phase 15 adds the Tailscale layer on top

</code_context>

<specifics>
## Specific Ideas

- No specific visual or UX requirements — this is pure infrastructure.
- Will's phone is the primary verification device (iPhone, referenced in ACCESS-02).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-remote-access-go-live*
*Context gathered: 2026-04-02*
