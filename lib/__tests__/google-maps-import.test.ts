import { describe, it, expect } from 'vitest';
import {
  parseLocationsFromText,
  parseSavedPlacesJson,
  isValidCoord,
} from '../../app/api/import/google-maps/route';

describe('isValidCoord', () => {
  it('accepts valid latitude/longitude', () => {
    expect(isValidCoord(35.5951, -82.5515)).toBe(true);
    expect(isValidCoord(0, 0)).toBe(true);
    expect(isValidCoord(-90, -180)).toBe(true);
    expect(isValidCoord(90, 180)).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(isValidCoord(91, 0)).toBe(false);
    expect(isValidCoord(-91, 0)).toBe(false);
    expect(isValidCoord(0, 181)).toBe(false);
    expect(isValidCoord(0, -181)).toBe(false);
  });
});

describe('parseLocationsFromText', () => {
  it('extracts coords from Google Maps @lat,lon URL pattern', () => {
    const text = 'https://www.google.com/maps/@35.5951,-82.5515,14z';
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBeCloseTo(35.5951);
    expect(result[0].longitude).toBeCloseTo(-82.5515);
  });

  it('extracts place name and coords from /place/ URL', () => {
    const text =
      'https://www.google.com/maps/place/Pisgah+National+Forest/@35.3,-82.7,12z';
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pisgah National Forest');
    expect(result[0].latitude).toBeCloseTo(35.3);
    expect(result[0].longitude).toBeCloseTo(-82.7);
  });

  it('extracts decimal degree pairs', () => {
    const text = '35.5951, -82.5515';
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBeCloseTo(35.5951);
  });

  it('extracts name and coords when name is on the line before coords', () => {
    const text = 'My Campsite\n35.5951, -82.5515';
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Campsite');
    expect(result[0].latitude).toBeCloseTo(35.5951);
  });

  it('extracts name — coords inline pattern', () => {
    const text = 'Blue Ridge Parkway — 35.5951, -82.5515';
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Blue Ridge Parkway');
  });

  it('deduplicates coordinates across patterns', () => {
    const text = [
      'https://www.google.com/maps/@35.5951,-82.5515,14z',
      '35.5951, -82.5515',
    ].join('\n');
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for text with no recognizable patterns', () => {
    const result = parseLocationsFromText('nothing here at all');
    expect(result).toHaveLength(0);
  });

  it('handles multiple locations', () => {
    const text = [
      'https://www.google.com/maps/place/Spot+A/@35.0,-82.0,12z',
      'https://www.google.com/maps/place/Spot+B/@36.0,-83.0,12z',
    ].join('\n');
    const result = parseLocationsFromText(text);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('Spot A');
    expect(result.map((r) => r.name)).toContain('Spot B');
  });
});

describe('parseSavedPlacesJson', () => {
  const validFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-82.5515, 35.5951], // GeoJSON: [lon, lat]
        },
        properties: {
          Title: 'Pisgah Campsite',
          'Google Maps URL': 'https://maps.google.com/?cid=123',
          Location: {
            Address: '123 Forest Rd, Asheville, NC',
            'Business Name': 'Pisgah National Forest',
            'Geo Coordinates': {
              Latitude: '35.5951',
              Longitude: '-82.5515',
            },
          },
        },
      },
    ],
  };

  it('extracts name from Business Name field', () => {
    const result = parseSavedPlacesJson(validFeatureCollection);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pisgah National Forest');
  });

  it('extracts coordinates from geometry (GeoJSON lon, lat order)', () => {
    const result = parseSavedPlacesJson(validFeatureCollection);
    expect(result[0].latitude).toBeCloseTo(35.5951);
    expect(result[0].longitude).toBeCloseTo(-82.5515);
  });

  it('extracts address from Location.Address', () => {
    const result = parseSavedPlacesJson(validFeatureCollection);
    expect(result[0].address).toBe('123 Forest Rd, Asheville, NC');
  });

  it('falls back to Title when Business Name is absent', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-83.0, 36.0] },
          properties: {
            Title: 'My Favorite Spot',
            Location: {
              'Geo Coordinates': { Latitude: '36.0', Longitude: '-83.0' },
            },
          },
        },
      ],
    };
    const result = parseSavedPlacesJson(fc);
    expect(result[0].name).toBe('My Favorite Spot');
  });

  it('uses Geo Coordinates from properties when geometry is absent', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            Title: 'No Geometry',
            Location: {
              'Geo Coordinates': { Latitude: '35.0', Longitude: '-81.0' },
            },
          },
        },
      ],
    };
    const result = parseSavedPlacesJson(fc);
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBeCloseTo(35.0);
    expect(result[0].longitude).toBeCloseTo(-81.0);
  });

  it('skips features with no valid coordinates', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [200, 200] }, // invalid
          properties: { Title: 'Bad Coords' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-82.5, 35.5] },
          properties: { Title: 'Good Coords' },
        },
      ],
    };
    const result = parseSavedPlacesJson(fc);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Good Coords');
  });

  it('returns empty array for non-FeatureCollection input', () => {
    expect(parseSavedPlacesJson(null)).toHaveLength(0);
    expect(parseSavedPlacesJson({})).toHaveLength(0);
    expect(parseSavedPlacesJson({ type: 'Feature' })).toHaveLength(0);
    expect(parseSavedPlacesJson('not an object')).toHaveLength(0);
  });

  it('returns empty array for FeatureCollection with no features', () => {
    const result = parseSavedPlacesJson({ type: 'FeatureCollection', features: [] });
    expect(result).toHaveLength(0);
  });

  it('handles multiple features', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-82.5, 35.5] },
          properties: {
            Title: 'Spot A',
            Location: { 'Geo Coordinates': { Latitude: '35.5', Longitude: '-82.5' } },
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-83.0, 36.0] },
          properties: {
            Title: 'Spot B',
            Location: { 'Geo Coordinates': { Latitude: '36.0', Longitude: '-83.0' } },
          },
        },
      ],
    };
    const result = parseSavedPlacesJson(fc);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('Spot A');
    expect(result.map((r) => r.name)).toContain('Spot B');
  });
});
