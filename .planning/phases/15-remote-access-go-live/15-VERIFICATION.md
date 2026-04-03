---
phase: 15-remote-access-go-live
verified: 2026-04-02T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (automated checks complete; 2 items require live device confirmation)
re_verification: false
human_verification:
  - test: "Confirm Tailscale is still connected on Will's iPhone and Mac mini is reachable"
    expected: "Tailscale app on iPhone shows green dot; Mac mini node visible in device list"
    why_human: "Requires physical iPhone and live network state — cannot verify programmatically from this machine"
  - test: "Confirm PWA home screen icon still launches in standalone mode"
    expected: "Tapping 'Outland' icon opens app without Safari chrome (no address bar)"
    why_human: "Requires physical iPhone to verify installed PWA behavior"
---

# Phase 15: Remote Access & Go Live — Verification Report

**Phase Goal:** Will can access Outland OS from his phone anywhere via encrypted private network, with PWA install and offline mode working over the remote connection
**Verified:** 2026-04-02
**Status:** human_needed — all automated/documentable checks pass; 2 live-device confirmations remain
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                              | Status     | Evidence                                                                        |
|----|--------------------------------------------------------------------|------------|---------------------------------------------------------------------------------|
| 1  | Tailscale is running on both Mac mini and Will's iPhone            | ✓ VERIFIED | 15-01-SUMMARY: lisa-mini online v1.96.5 at 100.107.148.29; 15-02-SUMMARY: iPhone connected, both nodes visible |
| 2  | App is reachable via a stable MagicDNS hostname (no IP addresses) | ✓ VERIFIED | 15-01-SUMMARY: `lisa-mini.tailfd6d06.ts.net` assigned and resolving                |
| 3  | HTTPS works over Tailscale (required for service worker / PWA)    | ✓ VERIFIED | 15-01-SUMMARY: `curl https://lisa-mini.tailfd6d06.ts.net` → HTTP 200 from MacBook; Safari on iPhone loaded with padlock (15-02-SUMMARY) |
| 4  | App is installable as a PWA from Will's phone over Tailscale      | ✓ VERIFIED | 15-02-SUMMARY: "Add to Home Screen" completed; icon on iPhone home screen        |
| 5  | Offline mode works after PWA install                               | ✓ VERIFIED | 15-02-SUMMARY: airplane mode test passed — app shell + navigation loaded from service worker cache |

**Score:** 5/5 truths verified

---

### Required Artifacts

This is a pure infrastructure phase — no app code was modified. Artifacts are runtime state on the Mac mini, not files in this repo.

| Artifact                             | Expected                            | Status     | Details                                                   |
|--------------------------------------|-------------------------------------|------------|-----------------------------------------------------------|
| Tailscale binary (Mac mini)          | Installed, Standalone .pkg, v1.96.x | ✓ VERIFIED | v1.96.5 confirmed in 15-01-SUMMARY                        |
| Tailscale daemon state               | Online, in tailnet                  | ✓ VERIFIED | `tailscale status` → lisa-mini online at 100.107.148.29   |
| `tailscale serve` config             | HTTPS proxy → http://127.0.0.1:3000 | ✓ VERIFIED | `tailscale serve status` confirms proxy; `--bg` flag ensures persistence across reboots |
| MagicDNS hostname                    | `*.ts.net` resolving                | ✓ VERIFIED | `lisa-mini.tailfd6d06.ts.net` confirmed                   |
| Tailscale iOS app                    | Installed, authenticated            | ✓ VERIFIED | 15-02-SUMMARY: installed via App Store, same tailnet      |
| Service worker (`public/sw.js`)      | Domain-agnostic (no hardcoded origin) | ✓ VERIFIED | SHELL_ASSETS uses relative paths (`'/'`, `'/gear'`, etc.) — works over any HTTPS origin |
| PWA manifest                         | Present (Phase 8/10 artifact)       | ✓ VERIFIED | Pre-existing from Phase 8; install confirmed from phone   |

---

### Key Link Verification

| From                       | To                              | Via                              | Status     | Details                                                         |
|----------------------------|---------------------------------|----------------------------------|------------|------------------------------------------------------------------|
| `tailscale serve`          | `http://localhost:3000`         | HTTPS proxy on port 443          | ✓ WIRED    | `tailscale serve status` shows proxy http://127.0.0.1:3000; HTTP 200 confirmed by curl |
| iPhone Tailscale app       | lisa-mini Tailscale node        | WireGuard encrypted tunnel       | ✓ WIRED    | Both devices appear in `tailscale status` on Mac mini (15-02-SUMMARY) |
| Safari on iPhone           | `https://lisa-mini.tailfd6d06.ts.net` | MagicDNS resolution over Tailscale | ✓ WIRED | Page loaded with padlock icon, no cert warnings (15-02-SUMMARY) |
| Service worker cache       | SHELL_ASSETS (offline content)  | Browser Cache API                | ✓ WIRED    | Airplane mode test confirmed pages loaded from cache             |

---

### Data-Flow Trace (Level 4)

Not applicable. This is a pure infrastructure phase — no components rendering dynamic data were added or modified.

---

### Behavioral Spot-Checks

Phase 15 is infrastructure-only. All verification required physical devices (Mac mini + iPhone). Spot-checks were performed by Will during plan execution — results documented in SUMMARY files.

| Behavior                             | Verified By                     | Result   | Status  |
|--------------------------------------|---------------------------------|----------|---------|
| `tailscale version` on Mac mini      | 15-01-SUMMARY                   | v1.96.5  | ✓ PASS  |
| `tailscale status` shows lisa-mini   | 15-01-SUMMARY                   | online at 100.107.148.29 | ✓ PASS |
| `tailscale serve status` proxy active | 15-01-SUMMARY                  | proxy http://127.0.0.1:3000 | ✓ PASS |
| `curl https://lisa-mini.tailfd6d06.ts.net` from MacBook | 15-01-SUMMARY | HTTP 200 | ✓ PASS |
| Safari on iPhone: HTTPS loads, padlock shows | 15-02-SUMMARY            | Confirmed | ✓ PASS |
| PWA install via Safari Share sheet   | 15-02-SUMMARY                   | Icon on home screen | ✓ PASS |
| PWA opens in standalone mode         | 15-02-SUMMARY                   | Fullscreen, no Safari chrome | ✓ PASS |
| Airplane mode: app shell loads       | 15-02-SUMMARY                   | Navigation working | ✓ PASS |

---

### Requirements Coverage

All five ACCESS-* requirements are assigned to Phase 15 in REQUIREMENTS.md traceability table (line 98-102). Both plans in this phase collectively cover all five.

| Requirement | Source Plan | Description                                   | Status       | Evidence                                                        |
|-------------|-------------|-----------------------------------------------|--------------|-----------------------------------------------------------------|
| ACCESS-01   | 15-01       | Tailscale installed and running on Mac mini   | ✓ SATISFIED  | v1.96.5 Standalone .pkg, online at 100.107.148.29              |
| ACCESS-02   | 15-02       | Tailscale installed on Will's iPhone          | ✓ SATISFIED  | Installed, authenticated, connected to tailnet                  |
| ACCESS-03   | 15-01       | MagicDNS provides stable hostname             | ✓ SATISFIED  | `lisa-mini.tailfd6d06.ts.net` active and resolving              |
| ACCESS-04   | 15-01       | HTTPS works via Tailscale                     | ✓ SATISFIED  | curl HTTP 200 from MacBook; Safari padlock from iPhone          |
| ACCESS-05   | 15-02       | App installable as PWA from phone over Tailscale | ✓ SATISFIED | PWA icon on iPhone home screen, standalone mode confirmed      |

**Orphaned requirements:** None. REQUIREMENTS.md maps exactly ACCESS-01 through ACCESS-05 to Phase 15. Both PLANs declare the same five IDs split across them (01: ACCESS-01/03/04; 02: ACCESS-02/05). Full coverage, no gaps.

**Note:** REQUIREMENTS.md traceability table still shows all ACCESS-* as "Pending" — the status column was not updated after execution. This is a documentation inconsistency, not a functional gap. ROADMAP.md also still shows Phase 15 as "Not started" with unchecked plan boxes — same issue. Neither affects goal achievement.

---

### Anti-Patterns Found

No app code was modified in this phase. No anti-pattern scan is applicable. The only code examined (`public/sw.js`) was pre-existing from Phase 8/10 and contains no phase-15-introduced patterns. The service worker uses relative URLs for SHELL_ASSETS, confirming it is not hardcoded to a specific origin — this is correct behavior for the Tailscale hostname.

| File       | Line | Pattern | Severity | Impact |
|------------|------|---------|----------|--------|
| (none)     | —    | —       | —        | —      |

---

### Human Verification Required

#### 1. Tailscale Connectivity (Live State)

**Test:** Open Tailscale app on Will's iPhone. Check that the VPN toggle is on and lisa-mini appears in the device list. On Mac mini, run `tailscale status`.
**Expected:** iPhone shows green dot (connected); Mac mini status shows both lisa-mini and the iPhone as active nodes.
**Why human:** Network daemon state cannot be verified from this machine. Tailscale sessions can be disrupted by reboots, iOS background app refresh limits, or re-authentication.

#### 2. PWA Standalone Mode (Persistent)

**Test:** Tap the Outland OS icon on Will's iPhone home screen (without opening Safari first).
**Expected:** App opens in fullscreen standalone mode — no Safari address bar or navigation UI visible. App is usable.
**Why human:** Installed PWA behavior requires a physical device. Home screen icon installation was confirmed at time of execution but cannot be re-verified programmatically.

---

### Gaps Summary

No gaps blocking goal achievement. All five ACCESS-* requirements have documented execution evidence. The two human verification items above are routine live-state confirmations — they are not gaps in the implementation, they are checks that infrastructure daemons remain in their configured state.

One documentation inconsistency noted: REQUIREMENTS.md and ROADMAP.md both still show Phase 15 work as "Pending" / "Not started". These should be updated to reflect completion, but do not affect functional goal achievement.

---

_Verified: 2026-04-02_
_Verifier: Claude (gsd-verifier)_
