/**
 * Overpass API client for Outland OS — fuel & last stop planner
 * Free, no API key required. Queries OpenStreetMap via Overpass.
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

export interface LastStop {
  name: string
  distanceMiles: number
  category: 'fuel' | 'grocery' | 'outdoor'
}

export interface LastStopsResult {
  fuel: LastStop[]
  grocery: LastStop[]
  outdoor: LastStop[]
}

// Earth radius in miles
const EARTH_RADIUS_MILES = 3958.8

/**
 * Haversine formula — straight-line distance in miles between two lat/lon points.
 * Exported for direct testing.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_MILES * c
}

/**
 * Build OverpassQL query for fuel, grocery, and outdoor stops within 50km of a point.
 */
function buildOverpassQuery(lat: number, lon: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="fuel"](around:50000,${lat},${lon});
  node["shop"="supermarket"](around:50000,${lat},${lon});
  node["shop"="outdoor"](around:50000,${lat},${lon});
  node["shop"="sports"](around:50000,${lat},${lon});
  node["shop"="hardware"](around:50000,${lat},${lon});
);
out body;`
}

/**
 * Assign a category based on OSM tags.
 * Returns null for unrecognized tag combinations.
 */
function assignCategory(
  tags: Record<string, string>,
): 'fuel' | 'grocery' | 'outdoor' | null {
  if (tags['amenity'] === 'fuel') return 'fuel'
  if (tags['shop'] === 'supermarket') return 'grocery'
  if (tags['shop'] === 'outdoor' || tags['shop'] === 'sports') return 'outdoor'
  if (tags['shop'] === 'hardware') return 'outdoor'
  return null
}

/**
 * Fetch nearest fuel stations, grocery stores, and outdoor/hardware shops
 * within 50 km of the given coordinates using Overpass API.
 *
 * Returns up to 2 results per category, sorted by distance ascending.
 */
export async function fetchLastStops(
  latitude: number,
  longitude: number,
): Promise<LastStopsResult> {
  const query = buildOverpassQuery(latitude, longitude)

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Overpass API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  const elements: Array<{
    id: number
    lat: number
    lon: number
    tags?: Record<string, string>
  }> = data.elements ?? []

  // Deduplicate by OSM node id
  const seen = new Map<number, { id: number; lat: number; lon: number; tags: Record<string, string> }>()
  for (const el of elements) {
    if (!seen.has(el.id) && el.tags) {
      seen.set(el.id, { id: el.id, lat: el.lat, lon: el.lon, tags: el.tags })
    }
  }

  const fuel: LastStop[] = []
  const grocery: LastStop[] = []
  const outdoor: LastStop[] = []

  for (const el of seen.values()) {
    // Filter: must have a non-empty name
    const name = el.tags['name']
    if (!name || name.trim() === '') continue

    const category = assignCategory(el.tags)
    if (!category) continue

    const distanceMiles = Math.round(
      haversineDistanceMiles(latitude, longitude, el.lat, el.lon) * 10,
    ) / 10

    const stop: LastStop = { name, distanceMiles, category }

    if (category === 'fuel') fuel.push(stop)
    else if (category === 'grocery') grocery.push(stop)
    else outdoor.push(stop)
  }

  // Sort each category by distance ascending, slice to max 2
  const sortByDist = (a: LastStop, b: LastStop) => a.distanceMiles - b.distanceMiles

  return {
    fuel: fuel.sort(sortByDist).slice(0, 2),
    grocery: grocery.sort(sortByDist).slice(0, 2),
    outdoor: outdoor.sort(sortByDist).slice(0, 2),
  }
}
