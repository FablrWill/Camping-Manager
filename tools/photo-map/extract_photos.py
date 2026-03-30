#!/usr/bin/env python3
"""Extract GPS-tagged photo metadata from a Google Photos Takeout export.

Walks the Takeout directory, finds all photo JSON sidecar files, extracts
GPS coordinates and metadata, and outputs a photos.json file suitable for
import into Camp Commander's map view.

Usage:
    python extract_photos.py <takeout_folder> [--output photos.json]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Extensions we treat as photo/video files
MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".mp4", ".mov", ".webp", ".gif"}

# Sidecar files to skip (not photo metadata)
SKIP_FILES = {"metadata.json", "user-generated-memory-titles.json", "shared_album_comments.json"}


def parse_sidecar(json_path: Path, takeout_root: Path) -> dict | None:
    """Parse a Google Photos JSON sidecar file and extract metadata."""
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    # Must have a title to be a photo sidecar
    title = data.get("title")
    if not title:
        return None

    # Skip known non-photo metadata files
    if json_path.name.lower() in SKIP_FILES:
        return None

    # Extract timestamp
    photo_taken = data.get("photoTakenTime", {})
    timestamp_str = photo_taken.get("timestamp")
    if not timestamp_str:
        return None

    try:
        timestamp_sec = int(timestamp_str)
    except (ValueError, TypeError):
        return None

    dt = datetime.fromtimestamp(timestamp_sec, tz=timezone.utc)

    # Extract GPS — prefer geoDataExif over geoData
    geo = data.get("geoDataExif") or data.get("geoData") or {}
    lat = geo.get("latitude", 0.0)
    lon = geo.get("longitude", 0.0)
    altitude = geo.get("altitude")

    # Check if GPS is valid (both 0.0 means no real location)
    has_gps = not (lat == 0.0 and lon == 0.0)

    # Find the corresponding image file
    image_path = None
    image_name = json_path.stem  # Remove .json extension

    # Google sometimes names sidecars like "IMG_1234.jpg.json" or "IMG_1234.json"
    parent = json_path.parent
    for ext in MEDIA_EXTENSIONS:
        candidate = parent / f"{image_name}{ext}"
        if candidate.exists():
            image_path = str(candidate.relative_to(takeout_root))
            break
        # Also try without double extension
        candidate2 = parent / image_name
        if candidate2.exists() and candidate2.suffix.lower() in MEDIA_EXTENSIONS:
            image_path = str(candidate2.relative_to(takeout_root))
            break

    # Google Photos URL
    google_url = data.get("url")

    # Determine location source
    location_source = None
    if has_gps:
        location_source = "exif"

    entry = {
        "title": title,
        "lat": lat if has_gps else None,
        "lon": lon if has_gps else None,
        "altitude": altitude if altitude and altitude != 0.0 else None,
        "timestamp": dt.isoformat(),
        "timestampMs": timestamp_sec * 1000,
        "year": dt.year,
        "month": dt.month,
        "day": dt.day,
        "dateLabel": dt.strftime("%b %-d, %Y"),
        "imagePath": image_path,
        "googleUrl": google_url,
        "locationSource": location_source,
        "noGps": not has_gps,
    }

    # Flag HEIC files
    if image_path and image_path.lower().endswith(".heic"):
        entry["heic"] = True

    return entry


def extract_photos(takeout_folder: str, output: str = "photos.json"):
    """Walk the Takeout folder and extract all photo metadata."""
    takeout_root = Path(takeout_folder).resolve()

    if not takeout_root.is_dir():
        print(f"Error: '{takeout_folder}' is not a directory", file=sys.stderr)
        sys.exit(1)

    photos = []
    seen_titles = {}
    gps_count = 0
    no_gps_count = 0
    skipped = 0

    # Find all JSON files recursively
    json_files = sorted(takeout_root.rglob("*.json"))
    print(f"Scanning {len(json_files)} JSON files in {takeout_root}...")

    for json_path in json_files:
        entry = parse_sidecar(json_path, takeout_root)
        if entry is None:
            skipped += 1
            continue

        # Handle duplicate titles
        title = entry["title"]
        if title in seen_titles:
            seen_titles[title] += 1
            base, ext = os.path.splitext(title)
            entry["title"] = f"{base}_{seen_titles[title]}{ext}"
        else:
            seen_titles[title] = 0

        photos.append(entry)

        if entry["noGps"]:
            no_gps_count += 1
        else:
            gps_count += 1

    # Sort by timestamp
    photos.sort(key=lambda p: p.get("timestampMs", 0))

    # Write output
    output_path = Path(output)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(photos, f, indent=2, ensure_ascii=False)

    # Summary
    print(f"\n{'='*50}")
    print(f"  {gps_count} photos with GPS extracted")
    print(f"  {no_gps_count} photos with NO GPS flagged (noGps: true)")
    if no_gps_count > 0:
        print(f"    → Run enrich_screenshots.py to recover locations")
    print(f"  {skipped} files skipped (malformed/non-photo)")
    print(f"  Output: {output_path.resolve()}")
    print(f"{'='*50}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract GPS-tagged photo metadata from a Google Photos Takeout export.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_photos.py ~/Downloads/Takeout
  python extract_photos.py ~/Downloads/Takeout --output my_photos.json
        """,
    )
    parser.add_argument("takeout_folder", help="Path to unzipped Google Takeout folder")
    parser.add_argument("--output", "-o", default="photos.json", help="Output file path (default: photos.json)")

    args = parser.parse_args()
    extract_photos(args.takeout_folder, args.output)


if __name__ == "__main__":
    main()
