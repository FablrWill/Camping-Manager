# S29: Altitude Awareness Callouts — Plan

## Goal

Surface Location.altitude in the UI with appropriate callouts and add an AltitudeCard to trip prep for high-elevation destinations.

## Files Created

- `components/AltitudeCard.tsx` — elevation badge, tips list, "bring extra fuel" reminder for > 8,000ft
- `lib/altitude.ts` — `getAltitudeWarning(altitudeFt): {level, tips[]}` — pure function, meters→feet conversion
- `prisma/migrations/20260404230000_add_location_altitude/migration.sql` — adds altitude column to Location if not present

## Files Modified

- `components/LocationForm.tsx` — altitude display line when set, inline amber callout panel if > 6,000ft
- `components/TripPrepClient.tsx` — render AltitudeCard above PreTripAlertCard when altitude > 6,000ft
- `app/api/trips/[id]/prep/route.ts` — include location.altitude in prep response
- `app/spots/spots-client.tsx` — show altitude in spot popup when set

## Key Decisions

- Altitude stored in meters in DB (EXIF standard), converted to feet in lib/altitude.ts (ft = meters × 3.28084)
- Thresholds: > 6,000ft = moderate, > 9,000ft = stronger warning
- No external API — uses existing Location.altitude field
- Pure function in lib/altitude.ts — testable, no side effects

## Verification

- `npm run build` passes
- No TypeScript errors
