import ExifParser from "exif-parser";

export interface ExifGpsData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  takenAt: Date | null;
}

export function extractGps(buffer: Buffer): ExifGpsData | null {
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    const lat = result.tags?.GPSLatitude;
    const lon = result.tags?.GPSLongitude;

    // Skip if no GPS or 0,0 (no real location)
    if (lat == null || lon == null) return null;
    if (lat === 0 && lon === 0) return null;

    const altitude = result.tags?.GPSAltitude ?? null;

    // DateTimeOriginal is a unix timestamp (seconds)
    const timestamp = result.tags?.DateTimeOriginal;
    const takenAt = timestamp ? new Date(timestamp * 1000) : null;

    return { latitude: lat, longitude: lon, altitude, takenAt };
  } catch {
    return null;
  }
}
