# S22: Seasonal Spot Ratings — Context

**Session:** S22
**Date:** 2026-04-04
**Status:** Done

## Background

Different camping spots are good at different times of year. Davidson River is great in fall, brutal in summer heat. Will needed a way to rate each saved location by season so the "when is this spot best?" question is answered at a glance.

## What This Addressed

- Location cards had a single overall rating but no seasonal context
- Couldn't answer "which of my spots are good in winter?" easily
- Map popup showed rating but no best-season indicator

## Design Decision

- **2×2 star pickers** in LocationForm — one star row for each of Spring/Summer/Fall/Winter
- **"Best in [Season]" badge** on SpotMap popup — derived server-side from ratings (highest ≥ 4 stars)
- **SeasonalRating model** — separate table with @@unique[locationId, season] so each location has at most one rating per season

## Key Decisions

- @@unique constraint → upsert pattern on POST (no duplicate season rows per location)
- bestSeason derived server-side in GET /api/locations (not in the client)
- Star taps fire-and-forget POST (optimistic update) — notes save on blur
- Must run serially with other schema-changing sessions (S25, S26 also touch schema.prisma)
