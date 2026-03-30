## 2026-03-30 — Session 4: Interactive Timeline Map + Google Takeout Import

### Created
- `tools/photo-map/` — Python scripts: extract_photos.py, extract_timeline.py, enrich_screenshots.py
- Prisma models: `TimelinePoint`, `PlaceVisit`, `ActivitySegment`
- Import APIs: `/api/import/photos`, `/api/import/timeline`
- Timeline API: `/api/timeline` with date filtering

### Changed
- `SpotMap.tsx` — Complete rewrite: marker clustering, color-coded activity paths, place visit markers, dark mode tiles, layer toggles, path animation with speed control
- `spots-client.tsx` — Day picker, day summary card, animation controls

### Decisions Made
- **Activity color coding** — hiking=green, driving=red, cycling=blue, kayaking=teal, flying=purple
- **Photo marker colors** — blue=EXIF GPS, green=vision exact, orange=vision approximate
