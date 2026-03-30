## 2026-03-30 — Session 3: Photo Map

### Created
- `Photo` model, `/spots` page with Leaflet/OpenStreetMap
- `SpotMap.tsx`, `PhotoUpload.tsx` — drag-drop upload with EXIF GPS extraction
- `lib/exif.ts` — EXIF GPS parser utility

### Decisions Made
- **Leaflet/OpenStreetMap** over Google Maps — free, no API key, no rate limits
- **Store compressed copy locally** (~100KB JPEG) — works offline
