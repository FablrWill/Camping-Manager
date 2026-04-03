---
plan: 15-02
phase: 15-remote-access-go-live
status: complete
completed: 2026-04-02
---

# Plan 15-02: iPhone + Go-Live Verification — Summary

## What Was Built

Outland OS accessed from iPhone over Tailscale HTTPS. PWA installed to home screen via Safari. App verified loading offline (airplane mode) with navigation working.

## Verification

- `https://lisa-mini.tailfd6d06.ts.net` loads in Safari on iPhone ✅
- No certificate errors ✅
- "Add to Home Screen" via Safari Share sheet — installed ✅
- App opens fullscreen from home screen icon ✅
- Airplane mode — app loads and navigation works ✅

## Requirements Addressed

- ACCESS-02: Tailscale on Will's iPhone (connected to tailnet) ✅
- ACCESS-05: PWA installable from phone over Tailscale ✅

## Notes

- Chrome on iPhone visited first but doesn't support PWA install — switched to Safari
- Service worker required one full connected visit before offline worked (expected behavior)
- No trips in DB yet so "Leaving Now" cache not tested, but app shell + navigation confirmed offline

## Deviations

None material. Minor: Chrome visited before Safari — offline required Safari restart to activate service worker cache.
