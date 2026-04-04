// lib/gpx-to-geojson.ts
// Server-side GPX → GeoJSON conversion using @tmcw/togeojson + @xmldom/xmldom
// Must use xmldom's DOMParser — native browser DOMParser not available in Node.js
import { gpx as toGeojsonGpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection, Feature } from 'geojson';

/**
 * Convert GPX XML string to GeoJSON FeatureCollection.
 * MultiLineString features are normalized to individual LineString features
 * to work around Leaflet 1.9.4 bug (GitHub #9533 — unfixed as of April 2025).
 */
export function gpxToGeoJson(gpxString: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(gpxString, 'text/xml');
  const fc = toGeojsonGpx(doc) as FeatureCollection;
  return normalizeMultiLineStrings(fc);
}

function normalizeMultiLineStrings(fc: FeatureCollection): FeatureCollection {
  const features: Feature[] = fc.features.flatMap((f) => {
    if (f.geometry.type === 'MultiLineString') {
      return f.geometry.coordinates.map((coords) => ({
        type: 'Feature' as const,
        properties: f.properties,
        geometry: { type: 'LineString' as const, coordinates: coords },
      }));
    }
    return [f];
  });
  return { ...fc, features };
}
