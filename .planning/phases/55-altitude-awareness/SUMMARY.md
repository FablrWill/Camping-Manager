# S29: Altitude Awareness Callouts — Summary

**Completed:** 2026-04-04
**Session:** S29 (V2 queue)

## What Was Shipped

- **getAltitudeWarning()** (`lib/altitude.ts`) — pure function: meters→feet conversion, level (none/moderate/high), tips array
- **AltitudeCard** (`components/AltitudeCard.tsx`) — elevation badge, tips list, "bring extra fuel" reminder > 8,000ft
- **LocationForm callout** — altitude display + amber warning panel when spot is above 6,000ft
- **Trip prep integration** — AltitudeCard renders above PreTripAlertCard when destination altitude > 6,000ft
- **SpotMap popup** — altitude shown in popup when set
- **Migration** — adds altitude column if not already present

## Schema Changes

- `altitude Float?` on Location — altitude in meters (populated from EXIF, or manually for locations without photos)

## Key Notes

- Altitude stored in meters (EXIF standard); lib/altitude.ts converts to feet for display (ft = meters × 3.28084)
- Thresholds: > 6,000ft moderate callout, > 9,000ft stronger warning
- Pure function — no external API, no DB reads in the computation

## Follow-On

- Deferred: manual altitude input for spots added without EXIF photos (currently EXIF-only)
- Future: "bring extra fuel" reminder as part of AI packing list context
