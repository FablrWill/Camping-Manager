import { describe, it, expect, vi, beforeEach } from 'vitest'
import { haversineDistanceMiles, fetchLastStops } from '@/lib/overpass'

describe('haversineDistanceMiles', () => {
  it('returns approximately 97.5 miles from Asheville NC to Charlotte NC', () => {
    // Asheville: 35.5951, -82.5515 | Charlotte: 35.2271, -80.8431
    const dist = haversineDistanceMiles(35.5951, -82.5515, 35.2271, -80.8431)
    expect(dist).toBeGreaterThan(95)
    expect(dist).toBeLessThan(100)
  })

  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceMiles(35.5951, -82.5515, 35.5951, -82.5515)).toBe(0)
  })
})

describe('fetchLastStops', () => {
  const LAT = 35.5951
  const LON = -82.5515

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns empty arrays when Overpass returns no elements', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result).toEqual({ fuel: [], grocery: [], outdoor: [] })
  })

  it('filters out elements with no name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 35.60, lon: -82.55, tags: { amenity: 'fuel' } }, // no name
          { id: 2, lat: 35.61, lon: -82.55, tags: { amenity: 'fuel', name: '' } }, // empty name
          { id: 3, lat: 35.62, lon: -82.55, tags: { amenity: 'fuel', name: 'Good Gas' } }, // valid
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.fuel).toHaveLength(1)
    expect(result.fuel[0].name).toBe('Good Gas')
  })

  it('deduplicates elements by OSM node id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 42, lat: 35.60, lon: -82.55, tags: { amenity: 'fuel', name: 'Shell' } },
          { id: 42, lat: 35.60, lon: -82.55, tags: { amenity: 'fuel', name: 'Shell Duplicate' } },
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.fuel).toHaveLength(1)
  })

  it('sorts results by distance ascending within each category', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 35.70, lon: -82.55, tags: { amenity: 'fuel', name: 'Far Gas' } },
          { id: 2, lat: 35.60, lon: -82.55, tags: { amenity: 'fuel', name: 'Near Gas' } },
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.fuel[0].name).toBe('Near Gas')
    expect(result.fuel[1].name).toBe('Far Gas')
  })

  it('returns max 2 results per category', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 35.601, lon: -82.55, tags: { amenity: 'fuel', name: 'Gas A' } },
          { id: 2, lat: 35.602, lon: -82.55, tags: { amenity: 'fuel', name: 'Gas B' } },
          { id: 3, lat: 35.603, lon: -82.55, tags: { amenity: 'fuel', name: 'Gas C' } },
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.fuel).toHaveLength(2)
  })

  it('assigns categories correctly by OSM tags', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 35.60, lon: -82.55, tags: { amenity: 'fuel', name: 'Shell' } },
          { id: 2, lat: 35.61, lon: -82.55, tags: { shop: 'supermarket', name: 'Walmart' } },
          { id: 3, lat: 35.62, lon: -82.55, tags: { shop: 'outdoor', name: 'REI' } },
          { id: 4, lat: 35.63, lon: -82.55, tags: { shop: 'sports', name: 'Sports Plus' } },
          { id: 5, lat: 35.64, lon: -82.55, tags: { shop: 'hardware', name: 'Ace Hardware' } },
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.fuel).toHaveLength(1)
    expect(result.fuel[0].name).toBe('Shell')
    expect(result.grocery).toHaveLength(1)
    expect(result.grocery[0].name).toBe('Walmart')
    expect(result.outdoor).toHaveLength(2) // REI + Sports Plus (hardware is 3rd but max 2)
  })

  it('assigns hardware shop to outdoor category', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 35.60, lon: -82.55, tags: { shop: 'hardware', name: 'Home Depot' } },
        ],
      }),
    }))

    const result = await fetchLastStops(LAT, LON)
    expect(result.outdoor).toHaveLength(1)
    expect(result.outdoor[0].category).toBe('outdoor')
  })
})
