// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Use require() inside test bodies so vitest doesn't fail at compile time
// before the source file exists (pattern established in Phase 33/29)

const TRACK_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Trail</name>
    <trkseg>
      <trkpt lat="35.5951" lon="-82.5515"><ele>800</ele></trkpt>
      <trkpt lat="35.5960" lon="-82.5520"><ele>810</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const WAYPOINT_ONLY_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <wpt lat="35.5951" lon="-82.5515"><name>Summit</name></wpt>
</gpx>`;

const NO_ELEVATION_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>No Elevation</name>
    <trkseg>
      <trkpt lat="35.5951" lon="-82.5515"></trkpt>
      <trkpt lat="35.5960" lon="-82.5520"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

// Simulate a MultiLineString scenario by constructing a FeatureCollection
// that normalizeMultiLineStrings would flatten (tested via white-box unit test)
const MULTI_SEGMENT_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Multi Segment</name>
    <trkseg>
      <trkpt lat="35.59" lon="-82.55"></trkpt>
      <trkpt lat="35.60" lon="-82.56"></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="35.61" lon="-82.57"></trkpt>
      <trkpt lat="35.62" lon="-82.58"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('gpxToGeoJson', () => {
  it('GPX-01: converts valid GPX with track to FeatureCollection', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    const result = gpxToGeoJson(TRACK_GPX);
    expect(result.type).toBe('FeatureCollection');
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features.length).toBeGreaterThan(0);
  });

  it('GPX-02: normalizes output so no MultiLineString features exist', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    const result = gpxToGeoJson(MULTI_SEGMENT_GPX);
    const multiLineStrings = result.features.filter(
      (f: { geometry: { type: string } }) => f.geometry.type === 'MultiLineString'
    );
    expect(multiLineStrings.length).toBe(0);
  });

  it('GPX-03: handles GPX without elevation gracefully', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    expect(() => gpxToGeoJson(NO_ELEVATION_GPX)).not.toThrow();
    const result = gpxToGeoJson(NO_ELEVATION_GPX);
    expect(result.type).toBe('FeatureCollection');
  });

  it('GPX-04: handles waypoint-only GPX (no tracks) without error', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    expect(() => gpxToGeoJson(WAYPOINT_ONLY_GPX)).not.toThrow();
    const result = gpxToGeoJson(WAYPOINT_ONLY_GPX);
    expect(result.type).toBe('FeatureCollection');
  });
});
