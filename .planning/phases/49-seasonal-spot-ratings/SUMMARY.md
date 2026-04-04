# S22: Seasonal Spot Ratings — Summary

**Completed:** 2026-04-04
**Session:** S22 (V2 queue)

## What Was Shipped

- **SeasonalRating model** — new Prisma model with @@unique[locationId, season], cascade delete on Location
- **Migration** — `20260404220000_add_seasonal_rating` applied
- **GET + POST /api/locations/[id]/seasonal-ratings** — list all ratings, upsert one season's rating
- **2×2 star pickers** in LocationForm — one star row per season (Spring/Summer/Fall/Winter)
- **"Best in [Season]" badge** on SpotMap popup — derived from highest-rated season ≥ 4 stars

## Schema Changes

- `SeasonalRating` model: id, locationId (FK, cascade), season (enum: spring/summer/fall/winter), stars (1-5), notes?
- `@@unique([locationId, season])` — one rating per season per location
- `seasonalRatings SeasonalRating[]` relation on Location

## Key Notes

- bestSeason computed server-side in GET /api/locations (not client-side)
- Star taps fire-and-forget POST for responsiveness (optimistic)
- Notes field on SeasonalRating saves on blur

## Follow-On

- Future: filter map by best season (e.g., "show only fall-rated spots")
