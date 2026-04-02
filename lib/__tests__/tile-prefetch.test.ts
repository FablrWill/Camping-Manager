import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTileUrlsForBoundingBox,
  getTileUrlsWithDestinationDetail,
  prefetchTiles,
  TILE_PREFETCH_ZOOM_LEVELS,
  TILE_PREFETCH_RADIUS_MILES,
  TILE_PREFETCH_CONCURRENCY,
  TILE_DESTINATION_ZOOM_LEVELS,
  TILE_DESTINATION_RADIUS_MILES,
} from '../tile-prefetch'

const ASHEVILLE_LAT = 35.5951
const ASHEVILLE_LON = -82.5515

describe('tile-prefetch constants', () => {
  it('TILE_PREFETCH_ZOOM_LEVELS equals [10, 11, 12, 13, 14]', () => {
    expect(Array.from(TILE_PREFETCH_ZOOM_LEVELS)).toEqual([10, 11, 12, 13, 14])
  })

  it('TILE_PREFETCH_RADIUS_MILES equals 20', () => {
    expect(TILE_PREFETCH_RADIUS_MILES).toBe(20)
  })

  it('TILE_PREFETCH_CONCURRENCY equals 6', () => {
    expect(TILE_PREFETCH_CONCURRENCY).toBe(6)
  })

  it('TILE_DESTINATION_ZOOM_LEVELS equals [15, 16]', () => {
    expect(Array.from(TILE_DESTINATION_ZOOM_LEVELS)).toEqual([15, 16])
  })

  it('TILE_DESTINATION_RADIUS_MILES equals 1', () => {
    expect(TILE_DESTINATION_RADIUS_MILES).toBe(1)
  })
})

describe('getTileUrlsForBoundingBox', () => {
  it('returns OSM tile URLs matching https://{a|b|c}.tile.openstreetmap.org/{z}/{x}/{y}.png pattern', () => {
    const urls = getTileUrlsForBoundingBox(ASHEVILLE_LAT, ASHEVILLE_LON, 20, [10, 11])
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/[abc]\.tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/)
    }
  })

  it('returns URLs for all specified zoom levels', () => {
    const zoomLevels = [10, 11, 12]
    const urls = getTileUrlsForBoundingBox(ASHEVILLE_LAT, ASHEVILLE_LON, 20, zoomLevels)
    const zooms = new Set(urls.map((u) => parseInt(u.split('/')[3])))
    expect(zooms.has(10)).toBe(true)
    expect(zooms.has(11)).toBe(true)
    expect(zooms.has(12)).toBe(true)
  })

  it('returns only center tile per zoom when radiusMiles is 0', () => {
    const urls = getTileUrlsForBoundingBox(ASHEVILLE_LAT, ASHEVILLE_LON, 0, [10])
    // Only 1 tile expected for a single zoom level at radius 0
    expect(urls.length).toBe(1)
  })

  it('caps output at 1000 URLs for very large radius', () => {
    // Use a huge radius to trigger cap
    const urls = getTileUrlsForBoundingBox(ASHEVILLE_LAT, ASHEVILLE_LON, 500, [10, 11, 12, 13, 14, 15])
    expect(urls.length).toBeLessThanOrEqual(1000)
  })

  it('uses a, b, c subdomains in tile URLs', () => {
    const urls = getTileUrlsForBoundingBox(ASHEVILLE_LAT, ASHEVILLE_LON, 20, [10, 11, 12])
    const subdomains = new Set(urls.map((u) => u.split('.')[0].replace('https://', '')))
    // Should use at least 1 subdomain (may not use all 3 for small sets)
    expect(subdomains.size).toBeGreaterThanOrEqual(1)
    for (const sub of subdomains) {
      expect(['a', 'b', 'c']).toContain(sub)
    }
  })
})

describe('getTileUrlsWithDestinationDetail', () => {
  it('includes zoom 15 and 16 tiles for destination detail', () => {
    const urls = getTileUrlsWithDestinationDetail(ASHEVILLE_LAT, ASHEVILLE_LON)
    const zooms = new Set(urls.map((u) => parseInt(u.split('/')[3])))
    expect(zooms.has(15)).toBe(true)
    expect(zooms.has(16)).toBe(true)
  })

  it('includes broad area zoom levels (10-14)', () => {
    const urls = getTileUrlsWithDestinationDetail(ASHEVILLE_LAT, ASHEVILLE_LON)
    const zooms = new Set(urls.map((u) => parseInt(u.split('/')[3])))
    expect(zooms.has(10)).toBe(true)
    expect(zooms.has(14)).toBe(true)
  })

  it('combines broad and destination detail tiles (both zoom ranges present)', () => {
    const combined = getTileUrlsWithDestinationDetail(ASHEVILLE_LAT, ASHEVILLE_LON)
    const zooms = new Set(combined.map((u) => parseInt(u.split('/')[3])))
    // Must have destination detail (15-16) AND broad area (10-14)
    expect(zooms.has(15)).toBe(true)
    expect(zooms.has(16)).toBe(true)
    expect(zooms.has(10)).toBe(true)
    expect(combined.length).toBeGreaterThan(0)
  })

  it('respects the 1000 URL cap', () => {
    const urls = getTileUrlsWithDestinationDetail(ASHEVILLE_LAT, ASHEVILLE_LON)
    expect(urls.length).toBeLessThanOrEqual(1000)
  })
})

describe('prefetchTiles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches tiles in concurrent batches of TILE_PREFETCH_CONCURRENCY', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    // Track when progress is called vs how many fetches happened
    const progressCallFetchCounts: number[] = []
    let fetchCallCount = 0
    fetchMock.mockImplementation(() => {
      fetchCallCount++
      return Promise.resolve({ ok: true })
    })

    // 12 URLs = 2 batches of 6
    const urls = Array.from({ length: 12 }, (_, i) => `https://a.tile.openstreetmap.org/10/${i}/0.png`)

    await prefetchTiles(urls, (fetched) => {
      progressCallFetchCounts.push(fetched)
    })

    // Should have exactly 2 progress calls (one per batch)
    expect(progressCallFetchCounts.length).toBe(2)
    // After first batch: 6 fetched, after second: 12
    expect(progressCallFetchCounts[0]).toBe(6)
    expect(progressCallFetchCounts[1]).toBe(12)
  })

  it('calls onProgress after each batch, not after each individual tile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const progressUpdates: number[] = []
    const urls = Array.from({ length: 18 }, (_, i) => `https://a.tile.openstreetmap.org/10/${i}/0.png`)

    await prefetchTiles(urls, (fetched, total) => {
      progressUpdates.push(fetched)
      expect(total).toBe(18)
    })

    // 18 URLs / 6 per batch = 3 progress calls
    expect(progressUpdates.length).toBe(3)
  })

  it('counts failed fetches separately from successful ones', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })  // 1 success
      .mockRejectedValue(new Error('Network error'))  // rest fail

    vi.stubGlobal('fetch', fetchMock)

    const urls = Array.from({ length: 3 }, (_, i) => `https://a.tile.openstreetmap.org/10/${i}/0.png`)
    const result = await prefetchTiles(urls)

    expect(result.fetched).toBe(1)
    expect(result.failed).toBe(2)
    expect(result.fetched + result.failed).toBe(3)
  })

  it('returns totals of fetched and failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const urls = Array.from({ length: 6 }, (_, i) => `https://a.tile.openstreetmap.org/10/${i}/0.png`)
    const result = await prefetchTiles(urls)

    expect(result.fetched).toBe(6)
    expect(result.failed).toBe(0)
  })

  it('works with empty URL array', async () => {
    const result = await prefetchTiles([])
    expect(result.fetched).toBe(0)
    expect(result.failed).toBe(0)
  })
})
