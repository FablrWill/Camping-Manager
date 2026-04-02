// OSM Slippy Map tile URL math per https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
// Addresses review concern: concurrent fetching + zoom 16 for destination detail

/** Default zoom levels for broad area prefetch — exported for configurability and testability */
export const TILE_PREFETCH_ZOOM_LEVELS: readonly number[] = [10, 11, 12, 13, 14] as const

/** High-detail zoom levels for destination center (campsite-level detail) */
export const TILE_DESTINATION_ZOOM_LEVELS: readonly number[] = [15, 16] as const

/** Radius in miles for destination high-detail tiles */
export const TILE_DESTINATION_RADIUS_MILES = 1

/** Default radius in miles for broad area tile prefetch bounding box */
export const TILE_PREFETCH_RADIUS_MILES = 20

/** Number of concurrent tile fetches per batch — addresses review: sequential was 2-10+ min */
export const TILE_PREFETCH_CONCURRENCY = 6

function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y }
}

const MAX_TILES = 1000 // Safety cap to prevent accidental bulk download

export function getTileUrlsForBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMiles: number = TILE_PREFETCH_RADIUS_MILES,
  zoomLevels: readonly number[] = TILE_PREFETCH_ZOOM_LEVELS
): string[] {
  // 1/69 degrees per mile — rough approximation, negligible error at 35deg N for 20-mile radius
  const degreesPerMile = 1 / 69
  const latDelta = radiusMiles * degreesPerMile
  const lonDelta = (radiusMiles * degreesPerMile) / Math.cos((centerLat * Math.PI) / 180)
  const urls: string[] = []

  for (const zoom of zoomLevels) {
    const topLeft = latLonToTile(centerLat + latDelta, centerLon - lonDelta, zoom)
    const bottomRight = latLonToTile(centerLat - latDelta, centerLon + lonDelta, zoom)

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3]
        urls.push(`https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`)
        if (urls.length >= MAX_TILES) return urls
      }
    }
  }

  return urls
}

/**
 * Generates tile URLs for both broad area (zoom 10-14, 20mi) and destination detail (zoom 15-16, 1mi).
 * Addresses review concern: zoom 14 is too coarse for scouting the actual campsite.
 * Detail tiles are always included — broad tiles fill remaining capacity up to MAX_TILES.
 */
export function getTileUrlsWithDestinationDetail(
  centerLat: number,
  centerLon: number
): string[] {
  // Generate destination detail tiles first — these are priority (campsite-level scouting)
  const detailUrls = getTileUrlsForBoundingBox(
    centerLat,
    centerLon,
    TILE_DESTINATION_RADIUS_MILES,
    TILE_DESTINATION_ZOOM_LEVELS
  )
  // Fill remaining capacity with broad area tiles
  const remainingCapacity = MAX_TILES - detailUrls.length
  const broadUrls = getTileUrlsForBoundingBox(
    centerLat,
    centerLon,
    TILE_PREFETCH_RADIUS_MILES,
    TILE_PREFETCH_ZOOM_LEVELS
  ).slice(0, remainingCapacity)
  return [...detailUrls, ...broadUrls]
}

/**
 * Fetches tiles in concurrent batches of TILE_PREFETCH_CONCURRENCY (default 6).
 * Addresses review concern: sequential fetching took 2-10+ minutes for 200-800 tiles.
 * SW intercepts each fetch and caches the tile response in tile-cache-v1 (verified in public/sw.js).
 */
export async function prefetchTiles(
  urls: string[],
  onProgress?: (fetched: number, total: number) => void
): Promise<{ fetched: number; failed: number }> {
  let fetched = 0
  let failed = 0

  // Batch fetch in groups of TILE_PREFETCH_CONCURRENCY for practical speed
  for (let i = 0; i < urls.length; i += TILE_PREFETCH_CONCURRENCY) {
    const batch = urls.slice(i, i + TILE_PREFETCH_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((url) => fetch(url, { mode: 'no-cors' }))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        fetched++
      } else {
        failed++
      }
    }

    onProgress?.(fetched + failed, urls.length)
  }

  return { fetched, failed }
}
