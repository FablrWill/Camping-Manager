#!/usr/bin/env python3
"""Enrich map screenshots with AI-inferred GPS coordinates.

Finds all photos in photos.json that have no GPS data (noGps: true), sends
map screenshots to Claude's vision API to identify the location shown, and
updates photos.json with recovered coordinates.

Usage:
    python enrich_screenshots.py [--photos photos.json] [--dry-run] [--confidence medium] [--limit N] [--force]

Requirements:
    export ANTHROPIC_API_KEY=your_key_here
    pip install anthropic pillow
"""

import argparse
import base64
import json
import sys
import time
from pathlib import Path

VISION_PROMPT = """You are a geolocation expert. Look at this image carefully.

Determine:
1. Is this a screenshot of a map application (Google Maps, Apple Maps, AllTrails, Gaia GPS, etc.)?
2. If yes, what location does the map show? Look for:
   - Visible coordinates or lat/lon in the UI
   - Street names, city names, place names
   - Pins or markers with location labels
   - Distinctive landmarks or terrain
   - Any text overlays showing an address or place name

Respond ONLY with a JSON object in this exact format, no other text:
{
  "isMap": true or false,
  "lat": decimal latitude or null,
  "lon": decimal longitude or null,
  "locationDescription": "human-readable description of the place shown" or null,
  "confidence": "high" | "medium" | "low" | "none",
  "reasoning": "brief explanation of how you identified the location"
}

Rules:
- If you can read exact coordinates from the image UI, use those directly (highest accuracy)
- If you can identify a specific named place, geocode it to approximate center coordinates
- If the image is NOT a map screenshot, set isMap: false and all other fields to null
- If it is a map but you cannot determine the location, set lat/lon to null and confidence: "none"
- Never guess or hallucinate coordinates. Only return coords you can directly read or reliably infer."""

# Confidence levels in order
CONFIDENCE_LEVELS = ["none", "low", "medium", "high"]

# Supported image extensions for vision API
VISION_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Cost estimate per image (claude-sonnet-4-20250514 with vision)
COST_PER_IMAGE = 0.003


def resize_for_vision(image_path: str, max_px: int = 1500) -> bytes:
    """Resize an image for the vision API, keeping it under max_px on longest side."""
    from PIL import Image
    import io

    with Image.open(image_path) as img:
        # Convert RGBA to RGB if needed
        if img.mode == "RGBA":
            img = img.convert("RGB")

        img.thumbnail((max_px, max_px), Image.LANCZOS)
        buf = io.BytesIO()

        fmt = "JPEG" if image_path.lower().endswith((".jpg", ".jpeg")) else "PNG"
        img.save(buf, format=fmt, quality=85)
        return buf.getvalue()


def identify_map_location(client, image_path: str) -> dict | None:
    """Send an image to Claude's vision API and parse the location response."""
    try:
        image_bytes = resize_for_vision(image_path)
    except Exception as e:
        print(f"    Could not open image: {e}")
        return None

    image_data = base64.standard_b64encode(image_bytes).decode("utf-8")

    ext = Path(image_path).suffix.lower()
    media_type = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": VISION_PROMPT},
                ],
            }],
        )

        if not response.content or not hasattr(response.content[0], "text"):
            print(f"    Unexpected API response format")
            return None

        text = response.content[0].text.strip()

        # Try to extract JSON from the response
        try:
            if text.startswith("{"):
                return json.loads(text)
            # Sometimes the model wraps it in markdown code blocks
            if "```" in text:
                parts = text.split("```")
                if len(parts) >= 2:
                    json_str = parts[1]
                    if json_str.startswith("json"):
                        json_str = json_str[4:]
                    return json.loads(json_str.strip())
        except json.JSONDecodeError:
            print(f"    Could not parse API response as JSON")
            return None

        return None

    except Exception as e:
        print(f"    API error: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Enrich map screenshots with AI-inferred GPS coordinates.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python enrich_screenshots.py
  python enrich_screenshots.py --dry-run --limit 5
  python enrich_screenshots.py --confidence high --force

Cost: ~$0.003 per image with claude-sonnet-4-20250514. 100 images ≈ $0.30.
        """,
    )
    parser.add_argument("--photos", default="photos.json", help="Path to photos.json (default: photos.json)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be updated without writing changes")
    parser.add_argument("--confidence", default="medium", choices=["high", "medium", "low"], help="Minimum confidence to accept (default: medium)")
    parser.add_argument("--limit", type=int, help="Only process first N no-GPS photos")
    parser.add_argument("--force", action="store_true", help="Re-process photos that already have visionAttempted: true")
    parser.add_argument("--takeout-root", help="Path to Takeout folder (needed if imagePath values are relative)")

    args = parser.parse_args()

    # Check dependencies
    try:
        import anthropic  # noqa: F401
    except ImportError:
        print("Error: anthropic package required. Install with: pip install anthropic", file=sys.stderr)
        sys.exit(1)

    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("Error: Pillow package required. Install with: pip install pillow", file=sys.stderr)
        sys.exit(1)

    # Load photos
    photos_path = Path(args.photos)
    if not photos_path.exists():
        print(f"Error: '{args.photos}' not found. Run extract_photos.py first.", file=sys.stderr)
        sys.exit(1)

    with open(photos_path, "r", encoding="utf-8") as f:
        photos = json.load(f)

    # Resolve takeout root for relative image paths
    takeout_root = Path(args.takeout_root).resolve() if args.takeout_root else None

    # Find candidates
    min_confidence_idx = CONFIDENCE_LEVELS.index(args.confidence)
    candidates = []

    for i, photo in enumerate(photos):
        if not photo.get("noGps"):
            continue
        if not photo.get("imagePath"):
            continue

        ext = Path(photo["imagePath"]).suffix.lower()
        if ext not in VISION_EXTENSIONS:
            continue

        if photo.get("visionAttempted") and not args.force:
            continue

        # Resolve image path — try absolute first, then relative to takeout root
        image_path = Path(photo["imagePath"])
        if not image_path.is_absolute() and takeout_root:
            image_path = takeout_root / image_path
        if not image_path.exists():
            continue

        candidates.append((i, photo, str(image_path)))

    if args.limit:
        candidates = candidates[:args.limit]

    print(f"Found {len(candidates)} photos to process")
    if not candidates:
        print("Nothing to do.")
        return

    estimated_cost = len(candidates) * COST_PER_IMAGE
    print(f"Estimated API cost: ~${estimated_cost:.2f}")

    if args.dry_run:
        print("\n[DRY RUN] Would process these files:")
        for _, photo, resolved_path in candidates:
            print(f"  {photo['title']} ({resolved_path})")
        return

    # Initialize API client
    import anthropic
    client = anthropic.Anthropic()

    # Process each candidate
    maps_found = 0
    coords_written = 0
    not_maps = 0
    errors = 0

    for idx, (photo_idx, photo, resolved_path) in enumerate(candidates):
        print(f"\n[{idx + 1}/{len(candidates)}] {photo['title']}")

        result = identify_map_location(client, resolved_path)

        if result is None:
            photos[photo_idx]["visionAttempted"] = True
            photos[photo_idx]["visionResult"] = "api_error"
            errors += 1
            continue

        if not result.get("isMap"):
            print(f"    Not a map screenshot")
            photos[photo_idx]["visionAttempted"] = True
            photos[photo_idx]["visionResult"] = "not_a_map"
            not_maps += 1
            continue

        maps_found += 1
        confidence = result.get("confidence", "none")
        confidence_idx = CONFIDENCE_LEVELS.index(confidence) if confidence in CONFIDENCE_LEVELS else 0

        lat = result.get("lat")
        lon = result.get("lon")

        if lat is not None and lon is not None and confidence_idx >= min_confidence_idx:
            print(f"    Location: {result.get('locationDescription', 'Unknown')}")
            print(f"    Coords: {lat}, {lon} (confidence: {confidence})")

            photos[photo_idx]["lat"] = lat
            photos[photo_idx]["lon"] = lon
            photos[photo_idx]["locationSource"] = "vision"
            photos[photo_idx]["locationDescription"] = result.get("locationDescription")
            photos[photo_idx]["locationConfidence"] = confidence
            photos[photo_idx]["visionApproximate"] = confidence in ("low", "medium")
            photos[photo_idx]["visionReasoning"] = result.get("reasoning")
            photos[photo_idx]["noGps"] = False
            photos[photo_idx]["visionAttempted"] = True
            photos[photo_idx]["visionResult"] = "location_found"
            coords_written += 1
        else:
            reason = "below_threshold" if lat is not None else "no_location_found"
            print(f"    Confidence too low ({confidence}) or no coords — skipping")
            photos[photo_idx]["visionAttempted"] = True
            photos[photo_idx]["visionResult"] = reason
            if result.get("locationDescription"):
                photos[photo_idx]["locationDescription"] = result["locationDescription"]

        # Brief pause to avoid rate limiting
        time.sleep(0.5)

    # Write updated photos.json
    with open(photos_path, "w", encoding="utf-8") as f:
        json.dump(photos, f, indent=2, ensure_ascii=False)

    # Summary
    actual_cost = (len(candidates) - errors) * COST_PER_IMAGE
    print(f"\n{'='*50}")
    print(f"  {len(candidates)} photos processed")
    print(f"  {maps_found} identified as map screenshots")
    print(f"    {coords_written} coordinates written (at {args.confidence}+ confidence)")
    print(f"  {not_maps} not map screenshots")
    print(f"  {errors} errors")
    print(f"  Estimated API cost: ~${actual_cost:.2f}")
    print(f"  Updated: {photos_path}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
