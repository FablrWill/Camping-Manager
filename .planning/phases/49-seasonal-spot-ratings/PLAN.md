# S22: Seasonal Spot Ratings — Plan

## Goal

Allow rating each saved spot per season (Spring/Summer/Fall/Winter) and surface a "Best in [Season]" badge on the map popup.

## Files Created

- `app/api/locations/[id]/seasonal-ratings/route.ts` — GET all ratings for a location, POST upsert one season's rating
- `prisma/migrations/20260404220000_add_seasonal_rating/migration.sql` — creates SeasonalRating table

## Files Modified

- `prisma/schema.prisma` — new SeasonalRating model with @@unique[locationId, season] constraint, ratings relation on Location
- `components/LocationForm.tsx` — 2×2 star picker grid below the signal log panel (4 seasons × star row)
- `app/api/locations/route.ts` — include seasonalRatings in GET query, derive bestSeason server-side
- `components/SpotMap.tsx` — show "Best in [Season]" badge in location popup when bestSeason is set

## Key Decisions

- @@unique constraint on [locationId, season] → upsert pattern on POST
- bestSeason = highest season with rating ≥ 4 stars, computed server-side
- Star taps fire-and-forget POST (optimistic)
- No new npm packages

## Verification

- `npm run build` passes
- No TypeScript errors
