#!/usr/bin/env python3
"""Extract GPS timeline data from a Google Maps Location History Takeout export.

Parses Semantic Location History (preferred) and/or Records.json to produce:
  - timeline_path.json — raw GPS breadcrumb trail for rendering as a polyline
  - timeline_semantic.json — structured place visits and activity segments

Usage:
    python extract_timeline.py <takeout_folder> [--output-path timeline_path.json] [--output-semantic timeline_semantic.json] [--date YYYY-MM-DD]

Requirements:
    pip install ijson   (required for streaming large Records.json files)
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def e7_to_decimal(e7_value: int | float) -> float:
    """Convert Google's E7 coordinate format to decimal degrees."""
    return e7_value / 10_000_000


def parse_timestamp(ts_value) -> tuple[str, int] | None:
    """Parse either ISO timestamp or millisecond timestamp string.
    Returns (iso_string, milliseconds) or None."""
    if ts_value is None:
        return None

    if isinstance(ts_value, str):
        # ISO format: "2024-06-15T14:23:00Z"
        if "T" in ts_value:
            try:
                dt = datetime.fromisoformat(ts_value.replace("Z", "+00:00"))
                return dt.isoformat(), int(dt.timestamp() * 1000)
            except ValueError:
                return None
        # Millisecond string: "1718442000000"
        try:
            ms = int(ts_value)
            dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
            return dt.isoformat(), ms
        except (ValueError, OSError):
            return None

    if isinstance(ts_value, (int, float)):
        try:
            dt = datetime.fromtimestamp(ts_value / 1000, tz=timezone.utc)
            return dt.isoformat(), int(ts_value)
        except (ValueError, OSError):
            return None

    return None


def extract_semantic(takeout_folder: Path) -> tuple[list, list]:
    """Extract place visits and activity segments from Semantic Location History."""
    semantic_dir = None

    # Search for the Semantic Location History directory
    for candidate in [
        takeout_folder / "Location History" / "Semantic Location History",
        takeout_folder / "Location History (Timeline)" / "Semantic Location History",
        takeout_folder / "Takeout" / "Location History" / "Semantic Location History",
        takeout_folder / "Takeout" / "Location History (Timeline)" / "Semantic Location History",
    ]:
        if candidate.is_dir():
            semantic_dir = candidate
            break

    if not semantic_dir:
        print("  Warning: Semantic Location History directory not found — place visits and activity segments will be empty", file=sys.stderr)
        return [], []

    place_visits = []
    activity_segments = []

    # Process all monthly JSON files
    json_files = sorted(semantic_dir.rglob("*.json"))
    print(f"Found {len(json_files)} semantic history files")

    for json_path in json_files:
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            print(f"  Warning: Could not parse {json_path.name}", file=sys.stderr)
            continue

        timeline_objects = data.get("timelineObjects", [])

        for obj in timeline_objects:
            # Place visits
            pv = obj.get("placeVisit")
            if pv:
                location = pv.get("location", {})
                duration = pv.get("duration", {})

                lat_e7 = location.get("latitudeE7")
                lon_e7 = location.get("longitudeE7")
                if lat_e7 is None or lon_e7 is None:
                    continue

                start_ts = parse_timestamp(duration.get("startTimestamp") or duration.get("startTimestampMs"))
                end_ts = parse_timestamp(duration.get("endTimestamp") or duration.get("endTimestampMs"))

                if not start_ts or not end_ts:
                    continue

                duration_min = round((end_ts[1] - start_ts[1]) / 60000)

                place_visits.append({
                    "name": location.get("name", "Unknown"),
                    "address": location.get("address"),
                    "lat": e7_to_decimal(lat_e7),
                    "lon": e7_to_decimal(lon_e7),
                    "startTimestamp": start_ts[0],
                    "endTimestamp": end_ts[0],
                    "startMs": start_ts[1],
                    "endMs": end_ts[1],
                    "durationMinutes": max(duration_min, 1),
                    "confidence": pv.get("placeConfidence", "UNKNOWN"),
                })

            # Activity segments
            seg = obj.get("activitySegment")
            if seg:
                start_loc = seg.get("startLocation", {})
                end_loc = seg.get("endLocation", {})
                duration = seg.get("duration", {})

                start_lat_e7 = start_loc.get("latitudeE7")
                start_lon_e7 = start_loc.get("longitudeE7")
                end_lat_e7 = end_loc.get("latitudeE7")
                end_lon_e7 = end_loc.get("longitudeE7")

                if not all([start_lat_e7, start_lon_e7, end_lat_e7, end_lon_e7]):
                    continue

                start_ts = parse_timestamp(duration.get("startTimestamp") or duration.get("startTimestampMs"))
                end_ts = parse_timestamp(duration.get("endTimestamp") or duration.get("endTimestampMs"))

                if not start_ts or not end_ts:
                    continue

                duration_min = round((end_ts[1] - start_ts[1]) / 60000)

                # Extract waypoints
                waypoints = []
                wp_path = seg.get("waypointPath", {})
                simple_path = seg.get("simplifiedRawPath", {})

                # Prefer simplifiedRawPath (has timestamps), fall back to waypointPath
                if simple_path.get("points"):
                    for pt in simple_path["points"]:
                        lat_key = "latE7" if "latE7" in pt else "latitudeE7"
                        lon_key = "lngE7" if "lngE7" in pt else "longitudeE7"
                        if lat_key in pt and lon_key in pt:
                            waypoints.append({
                                "lat": e7_to_decimal(pt[lat_key]),
                                "lon": e7_to_decimal(pt[lon_key]),
                            })
                elif wp_path.get("waypoints"):
                    for pt in wp_path["waypoints"]:
                        lat_key = "latE7" if "latE7" in pt else "latitudeE7"
                        lon_key = "lngE7" if "lngE7" in pt else "longitudeE7"
                        if lat_key in pt and lon_key in pt:
                            waypoints.append({
                                "lat": e7_to_decimal(pt[lat_key]),
                                "lon": e7_to_decimal(pt[lon_key]),
                            })

                # If no waypoints, create start/end pair
                if not waypoints:
                    waypoints = [
                        {"lat": e7_to_decimal(start_lat_e7), "lon": e7_to_decimal(start_lon_e7)},
                        {"lat": e7_to_decimal(end_lat_e7), "lon": e7_to_decimal(end_lon_e7)},
                    ]

                activity_segments.append({
                    "activityType": seg.get("activityType", "UNKNOWN_ACTIVITY_TYPE"),
                    "startLat": e7_to_decimal(start_lat_e7),
                    "startLon": e7_to_decimal(start_lon_e7),
                    "endLat": e7_to_decimal(end_lat_e7),
                    "endLon": e7_to_decimal(end_lon_e7),
                    "startTimestamp": start_ts[0],
                    "endTimestamp": end_ts[0],
                    "startMs": start_ts[1],
                    "endMs": end_ts[1],
                    "durationMinutes": max(duration_min, 1),
                    "distanceMeters": seg.get("distance"),
                    "waypoints": waypoints,
                })

    # Sort by start time
    place_visits.sort(key=lambda x: x["startMs"])
    activity_segments.sort(key=lambda x: x["startMs"])

    return place_visits, activity_segments


def extract_records(takeout_folder: Path, date_filter: str | None = None) -> list:
    """Extract raw GPS breadcrumbs from Records.json using streaming parser."""
    records_path = None

    for candidate in [
        takeout_folder / "Location History" / "Records.json",
        takeout_folder / "Location History (Timeline)" / "Records.json",
        takeout_folder / "Takeout" / "Location History" / "Records.json",
        takeout_folder / "Takeout" / "Location History (Timeline)" / "Records.json",
    ]:
        if candidate.is_file():
            records_path = candidate
            break

    if not records_path:
        return []

    file_size_mb = records_path.stat().st_size / (1024 * 1024)
    print(f"Reading Records.json ({file_size_mb:.1f} MB)...")

    points = []

    # Try streaming parser first (for large files)
    try:
        import ijson

        with open(records_path, "rb") as f:
            for record in ijson.items(f, "locations.item"):
                lat_e7 = record.get("latitudeE7")
                lon_e7 = record.get("longitudeE7")
                if lat_e7 is None or lon_e7 is None:
                    continue

                # Parse timestamp
                ts = parse_timestamp(
                    record.get("timestamp")
                    or record.get("timestampMs")
                )
                if not ts:
                    continue

                # Date filter
                if date_filter:
                    day_str = ts[0][:10]  # YYYY-MM-DD from ISO
                    if day_str != date_filter:
                        continue

                # Get activity type
                activity_type = None
                activities = record.get("activity", [])
                if activities and activities[0].get("activity"):
                    best = max(activities[0]["activity"], key=lambda a: a.get("confidence", 0))
                    activity_type = best.get("type")

                points.append({
                    "lat": e7_to_decimal(lat_e7),
                    "lon": e7_to_decimal(lon_e7),
                    "altitude": record.get("altitude"),
                    "timestamp": ts[0],
                    "timestampMs": ts[1],
                    "accuracy": record.get("accuracy"),
                    "activityType": activity_type,
                })

        print(f"  Parsed {len(points)} points via streaming")

    except ImportError:
        # Fall back to json.load for smaller files
        if file_size_mb > 100:
            print("  Warning: Records.json is large. Install ijson for better performance:", file=sys.stderr)
            print("    pip install ijson", file=sys.stderr)

        with open(records_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for record in data.get("locations", []):
            lat_e7 = record.get("latitudeE7")
            lon_e7 = record.get("longitudeE7")
            if lat_e7 is None or lon_e7 is None:
                continue

            ts = parse_timestamp(
                record.get("timestamp")
                or record.get("timestampMs")
            )
            if not ts:
                continue

            if date_filter:
                day_str = ts[0][:10]
                if day_str != date_filter:
                    continue

            activity_type = None
            activities = record.get("activity", [])
            if activities and activities[0].get("activity"):
                best = max(activities[0]["activity"], key=lambda a: a.get("confidence", 0))
                activity_type = best.get("type")

            points.append({
                "lat": e7_to_decimal(lat_e7),
                "lon": e7_to_decimal(lon_e7),
                "altitude": record.get("altitude"),
                "timestamp": ts[0],
                "timestampMs": ts[1],
                "accuracy": record.get("accuracy"),
                "activityType": activity_type,
            })

        print(f"  Parsed {len(points)} points via json.load")

    # Sort by timestamp
    points.sort(key=lambda p: p["timestampMs"])

    return points


def downsample(points: list, max_points: int = 100_000, min_interval_sec: int = 10) -> list:
    """Downsample points to at most max_points, keeping at least min_interval_sec between points."""
    if len(points) <= max_points:
        return points

    print(f"  Downsampling {len(points)} → ~{max_points} points (min {min_interval_sec}s interval)")

    sampled = [points[0]]
    last_ms = points[0]["timestampMs"]

    interval_ms = min_interval_sec * 1000

    for pt in points[1:]:
        if pt["timestampMs"] - last_ms >= interval_ms:
            sampled.append(pt)
            last_ms = pt["timestampMs"]

    # If still too many, increase interval
    if len(sampled) > max_points:
        step = len(sampled) // max_points
        sampled = sampled[::step]

    print(f"  Result: {len(sampled)} points")
    return sampled


def filter_by_date(items: list, date_str: str, start_key: str = "startMs") -> list:
    """Filter items to a specific date (YYYY-MM-DD in UTC)."""
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        print(f"Error: Invalid date format '{date_str}'. Use YYYY-MM-DD.", file=sys.stderr)
        sys.exit(1)

    start_ms = int(target.timestamp() * 1000)
    end_ms = start_ms + 86_400_000  # +24 hours

    return [item for item in items if start_ms <= item.get(start_key, 0) < end_ms]


def main():
    parser = argparse.ArgumentParser(
        description="Extract GPS timeline data from Google Maps Location History Takeout.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_timeline.py ~/Downloads/Takeout
  python extract_timeline.py ~/Downloads/Takeout --date 2024-06-15
  python extract_timeline.py ~/Downloads/Takeout --output-path my_path.json
        """,
    )
    parser.add_argument("takeout_folder", help="Path to unzipped Google Takeout folder")
    parser.add_argument("--output-path", default="timeline_path.json", help="Raw GPS path output (default: timeline_path.json)")
    parser.add_argument("--output-semantic", default="timeline_semantic.json", help="Semantic output (default: timeline_semantic.json)")
    parser.add_argument("--date", help="Filter to a single day (YYYY-MM-DD)")

    args = parser.parse_args()
    takeout_root = Path(args.takeout_folder).resolve()

    if not takeout_root.is_dir():
        print(f"Error: '{args.takeout_folder}' is not a directory", file=sys.stderr)
        sys.exit(1)

    # Extract semantic data
    print("Extracting semantic location history...")
    place_visits, activity_segments = extract_semantic(takeout_root)

    # Extract raw path
    print("Extracting raw GPS breadcrumbs...")
    path_points = extract_records(takeout_root, date_filter=args.date)

    # Apply date filter to semantic data
    if args.date:
        place_visits = filter_by_date(place_visits, args.date, "startMs")
        activity_segments = filter_by_date(activity_segments, args.date, "startMs")

    # Downsample path if needed (unless filtering to a single day)
    original_count = len(path_points)
    if not args.date:
        path_points = downsample(path_points)

    # Compute date range
    date_range = {}
    if path_points:
        date_range = {
            "earliest": path_points[0]["timestamp"],
            "latest": path_points[-1]["timestamp"],
        }

    # Write path output
    path_output = {
        "points": path_points,
        "dateRange": date_range,
        "totalPoints": len(path_points),
    }
    with open(args.output_path, "w", encoding="utf-8") as f:
        json.dump(path_output, f, indent=2)

    # Write semantic output
    semantic_output = {
        "placeVisits": place_visits,
        "activitySegments": activity_segments,
    }
    with open(args.output_semantic, "w", encoding="utf-8") as f:
        json.dump(semantic_output, f, indent=2)

    # Summary
    print(f"\n{'='*50}")
    print(f"  {original_count} path points extracted ({len(path_points)} after downsampling)")
    print(f"  {len(place_visits)} place visits | {len(activity_segments)} activity segments")
    if date_range:
        print(f"  Date range: {date_range['earliest'][:10]} to {date_range['latest'][:10]}")
    print(f"  Output: {args.output_path}, {args.output_semantic}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
