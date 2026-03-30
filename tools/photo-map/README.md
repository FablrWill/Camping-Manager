# Photo Map — Google Takeout Import Tools

Extract GPS-tagged photos and timeline data from Google Takeout exports for use with Outland OS's interactive map.

## What This Does

Three Python scripts that process your Google Takeout data:

1. **extract_photos.py** — Pulls GPS coordinates, timestamps, and metadata from Google Photos JSON sidecar files
2. **extract_timeline.py** — Extracts your GPS breadcrumb trail and place visits from Google Maps Location History
3. **enrich_screenshots.py** — Uses Claude's vision AI to identify locations from map screenshots that have no GPS data

The output JSON files can be imported into Outland OS via the `/api/import/photos` and `/api/import/timeline` endpoints.

## Prerequisites

- Python 3.9+
- `pip install ijson` (required for large Records.json files)
- `pip install anthropic pillow` (only needed for enrich_screenshots.py)
- An Anthropic API key (only for the vision enrichment step)

## Step 1: Export Your Data

Go to [takeout.google.com](https://takeout.google.com) and select:
- **Google Photos** — your photo library with GPS metadata
- **Location History (Timeline)** — your GPS breadcrumb trail

Download and unzip. If the export splits into multiple ZIPs, unzip them all into the same parent folder.

## Step 2: Extract Photos

```bash
python extract_photos.py ~/Downloads/Takeout
```

This scans all JSON sidecar files, extracts GPS from `geoDataExif` (or `geoData` fallback), and outputs `photos.json`.

Photos without GPS are flagged as `noGps: true` — candidates for vision enrichment in Step 3.

**Options:**
- `--output my_photos.json` — custom output path

## Step 3: Enrich Map Screenshots (Optional)

Many screenshots of Google Maps, Apple Maps, or AllTrails saved to your camera roll have no EXIF GPS. Claude's vision API can read these screenshots and extract the location shown.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python enrich_screenshots.py
```

**Cost:** ~$0.003 per image. 100 screenshots ≈ $0.30.

**Options:**
- `--dry-run` — see what would be processed without calling the API
- `--limit 10` — only process first 10 images (good for testing)
- `--confidence high` — only accept locations where Claude read exact coordinates from the UI
- `--force` — re-process images that were already attempted

## Step 4: Extract Timeline

```bash
python extract_timeline.py ~/Downloads/Takeout
```

This produces two files:
- `timeline_path.json` — raw GPS breadcrumb trail (downsampled if >100k points)
- `timeline_semantic.json` — structured place visits and activity segments

**Options:**
- `--date 2024-06-15` — extract only a single day (no downsampling)

## Step 5: Import Into Outland OS

Use the API endpoints to bulk-import the extracted data:

```bash
# Import photos
curl -X POST http://localhost:3000/api/import/photos \
  -H "Content-Type: application/json" \
  -d "{\"photos\": $(cat photos.json), \"takeoutRoot\": \"$HOME/Downloads/Takeout\"}"

# Import timeline
curl -X POST http://localhost:3000/api/import/timeline \
  -H "Content-Type: application/json" \
  -d "{\"path\": $(cat timeline_path.json), \"semantic\": $(cat timeline_semantic.json), \"clearExisting\": true}"
```

Then open `http://localhost:3000/spots` to see everything on the map.

## Map Features

Once data is imported, the Spots page shows:

- **Photo markers** — clustered, color-coded by source:
  - Blue = EXIF GPS (precise)
  - Green = AI-read exact coordinates from map screenshot
  - Orange with ~ = AI-inferred approximate location
- **GPS path** — color-coded polylines by activity type (hiking=green, driving=red, cycling=blue)
- **Place visits** — pulsing red circles with name, duration, time range
- **Day picker** — filter everything to a single day, see a summary card
- **Path animation** — replay your GPS trail with adjustable speed
- **Dark mode** — toggle CartoDB Dark Matter tiles
- **Layer toggles** — show/hide photos, spots, paths, and place visits independently

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No path showing | Check Location History was included in your Takeout export |
| Path in wrong location | E7 coordinate bug — ensure dividing by 10,000,000 |
| CORS errors | Run the Next.js dev server, don't open files directly |
| Missing GPS on photos | Check Google Photos settings: Settings → Sharing → Remove geo-location = OFF |
| Records.json hangs | Install `ijson`: `pip install ijson` |
| Vision returns wrong location | Use `--confidence high` to only accept coords Claude read directly |
| `anthropic.AuthenticationError` | Check `ANTHROPIC_API_KEY` is set in your terminal |
