# Phase 15: Remote Access & Go Live - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 15-remote-access-go-live
**Areas discussed:** HTTPS approach, Go-live verification, Phase 14 handoff assumptions, Tailscale config depth

---

## HTTPS Approach

| Option | Description | Selected |
|--------|-------------|----------|
| tailscale serve | Built-in TLS proxy, one command, no extra software | ✓ |
| Caddy reverse proxy | More flexible, adds another moving part | |
| tailscale cert + Next.js HTTPS | Gets cert then configures Next.js to serve HTTPS directly | |

**User's choice:** tailscale serve
**Notes:** Fits the existing "no Nginx" philosophy. No extra servers.

---

## Go-Live Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Full PWA flow from phone | Connect from iPhone, install to home screen, test offline mode | ✓ |
| Accessibility only | App loads, HTTPS works, no PWA install required | |
| Written go-live checklist | Create runbook artifact, run through it as verification | |

**User's choice:** Full PWA flow from phone
**Notes:** Real-world smoke test, not just a connectivity check.

---

## Phase 14 Handoff Assumptions

| Option | Description | Selected |
|--------|-------------|----------|
| App running at localhost:3000 | Phase 14 delivers live local app; Phase 15 adds remote access | ✓ |
| App + Tailscale installed on Mac mini | Phase 14 also handles Tailscale install | |
| Discuss when planning | Leave boundary fuzzy | |

**User's choice:** App running at localhost:3000
**Notes:** Phase 15 owns Tailscale install on Mac mini; Phase 14 owns the local app.

---

## Tailscale Config Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Basic: install + MagicDNS only | Install, get hostname, configure serve. No ACLs/exit node. | ✓ |
| Basic + ACLs | Lock down ACL to Will's devices only | |
| You decide | Claude picks appropriate config for single-user tool | |

**User's choice:** Basic install + MagicDNS only
**Notes:** Single-user personal tool — simplicity wins.

---

## Claude's Discretion

- MagicDNS hostname: use whatever Tailscale auto-assigns
- `tailscale serve` persistence across reboots: Claude decides approach
- Whether serve config goes in deploy script vs one-time setup: Claude decides

## Deferred Ideas

None.
