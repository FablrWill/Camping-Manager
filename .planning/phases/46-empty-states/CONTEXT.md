# S19: Empty States + Skeleton Loaders — Context

**Session:** S19
**Date:** 2026-04-04
**Status:** Done

## Background

Part of the April 4 UX sprint. Three main list pages (Gear, Trips, Spots) showed a blank white screen while data was loading and nothing when the list was empty. This felt broken on first launch and after data operations.

## What This Addressed

- Gear page: blank on load, blank when no gear
- Trips page: blank on load, blank when no trips
- Spots/Map page: no empty state when no spots pinned

## Design Decision

Two patterns added:
1. **Skeleton loaders** — pulsing gray rectangles shown while the initial data fetch completes (matching the approximate layout of real cards)
2. **Empty state messages** — friendly message + action CTA when the list is genuinely empty (e.g., "No gear yet — add your first item")

## Scope

New component + three embed points:
- `components/ui/Skeleton.tsx` — new generic skeleton loader primitive (width/height/className props)
- `components/GearClient.tsx` — skeleton on load, empty state "No gear yet"
- `components/TripsClient.tsx` — skeleton on load, empty state "No trips yet"
- `app/spots/spots-client.tsx` — empty state when no spots
- `components/ui/index.ts` — export Skeleton

## Key Decisions

- Skeleton as a generic primitive (not a hardcoded gear/trip specific shape)
- Empty states include an action CTA (e.g., "Add your first item") to guide new users
- Depends on S16 for baseline component files
