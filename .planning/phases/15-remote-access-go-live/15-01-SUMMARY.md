---
plan: 15-01
phase: 15-remote-access-go-live
status: complete
completed: 2026-04-02
---

# Plan 15-01: Mac mini Tailscale + HTTPS Setup — Summary

## What Was Built

Tailscale installed and running on lisa-mini (Standalone .pkg, v1.96.5). MagicDNS and HTTPS certificates enabled in Tailscale admin console. `tailscale serve --bg --https=443 http://localhost:3000` configured — persistent HTTPS proxy active, survives reboots via Tailscale daemon state.

## Verification

- `tailscale status` — lisa-mini online at 100.107.148.29 ✅
- `tailscale serve status` — proxy http://127.0.0.1:3000 active ✅
- `curl https://lisa-mini.tailfd6d06.ts.net` from MacBook — HTTP 200 ✅

## Requirements Addressed

- ACCESS-01: Tailscale running on Mac mini ✅
- ACCESS-03: MagicDNS hostname `lisa-mini.tailfd6d06.ts.net` ✅
- ACCESS-04: HTTPS works via Tailscale serve ✅

## Key Facts

- MagicDNS hostname: `lisa-mini.tailfd6d06.ts.net`
- Tailscale IP: `100.107.148.29`
- HTTPS proxy: `tailscale serve --bg --https=443 http://localhost:3000` (self-persisting)
- No reverse proxy needed — Tailscale handles TLS termination

## Deviations

None. Matched plan exactly.
