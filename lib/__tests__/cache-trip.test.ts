import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock idb-keyval for offline-storage dependency
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  createStore: vi.fn(() => 'mock-store'),
}))

// Mock offline-storage
vi.mock('@/lib/offline-storage', () => ({
  saveTripSnapshot: vi.fn(async () => undefined),
  getTripSnapshot: vi.fn(async () => undefined),
}))

// Mock tile-prefetch for cache-trip integration tests
vi.mock('@/lib/tile-prefetch', () => ({
  getTileUrlsWithDestinationDetail: vi.fn(() => ['tile1.png', 'tile2.png']),
  prefetchTiles: vi.fn(async () => ({ fetched: 2, failed: 0 })),
  TILE_PREFETCH_ZOOM_LEVELS: [10, 11, 12, 13, 14],
  TILE_PREFETCH_RADIUS_MILES: 20,
  TILE_PREFETCH_CONCURRENCY: 6,
  TILE_DESTINATION_ZOOM_LEVELS: [15, 16],
  TILE_DESTINATION_RADIUS_MILES: 1,
}))

import {
  cacheTripData,
  CACHE_STEPS,
  CACHE_STEP_LABELS,
  type CacheStep,
  type StepStatus,
} from '../cache-trip'
import { saveTripSnapshot } from '@/lib/offline-storage'
import { getTileUrlsWithDestinationDetail, prefetchTiles } from '@/lib/tile-prefetch'

const MOCK_EMERGENCY = { name: 'Jane Doe', email: 'jane@example.com' }
const MOCK_COORDS = { lat: 35.5951, lon: -82.5515 }

function mockSuccessfulFetch(body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  } as Response)
}

describe('CACHE_STEPS', () => {
  it('contains all 8 step names', () => {
    expect(CACHE_STEPS).toHaveLength(8)
  })

  it('includes tiles as the 8th element', () => {
    expect(CACHE_STEPS[7]).toBe('tiles')
  })

  it('contains all original 7 steps plus tiles', () => {
    const expected: CacheStep[] = [
      'weather',
      'packingList',
      'mealPlan',
      'checklist',
      'emergency',
      'spots',
      'vehicle',
      'tiles',
    ]
    expect(CACHE_STEPS).toEqual(expected)
  })
})

describe('CACHE_STEP_LABELS', () => {
  it('has labels for all 8 steps', () => {
    for (const step of CACHE_STEPS) {
      expect(CACHE_STEP_LABELS[step]).toBeDefined()
      expect(typeof CACHE_STEP_LABELS[step]).toBe('string')
    }
  })

  it('tiles step has label "Map tiles"', () => {
    expect(CACHE_STEP_LABELS['tiles']).toBe('Map tiles')
  })
})

describe('cacheTripData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockSuccessfulFetch({ data: 'mock' })
  })

  it('calls onStepUpdate for each of the 8 steps', async () => {
    const updates: Array<{ step: CacheStep; status: StepStatus }> = []
    await cacheTripData('trip-1', MOCK_EMERGENCY, (step, status) => {
      updates.push({ step, status })
    })

    // Each step should get 'loading' then 'done' or 'error'
    const steps = [...new Set(updates.map((u) => u.step))]
    expect(steps).toHaveLength(8)
    expect(steps).toContain('tiles')
  })

  it('calls onStepUpdate for tiles step when tripCoords provided', async () => {
    const tileUpdates: StepStatus[] = []
    await cacheTripData('trip-1', MOCK_EMERGENCY, (step, status) => {
      if (step === 'tiles') tileUpdates.push(status)
    }, MOCK_COORDS)

    expect(tileUpdates).toContain('loading')
    expect(tileUpdates).toContain('done')
  })

  it('calls getTileUrlsWithDestinationDetail with trip coordinates', async () => {
    await cacheTripData('trip-1', MOCK_EMERGENCY, vi.fn(), MOCK_COORDS)

    expect(getTileUrlsWithDestinationDetail).toHaveBeenCalledWith(
      MOCK_COORDS.lat,
      MOCK_COORDS.lon
    )
  })

  it('calls prefetchTiles with URLs from getTileUrlsWithDestinationDetail', async () => {
    await cacheTripData('trip-1', MOCK_EMERGENCY, vi.fn(), MOCK_COORDS)

    expect(prefetchTiles).toHaveBeenCalledWith(['tile1.png', 'tile2.png'])
  })

  it('skips tiles step gracefully when tripCoords is undefined', async () => {
    const tileUpdates: StepStatus[] = []
    await cacheTripData('trip-1', MOCK_EMERGENCY, (step, status) => {
      if (step === 'tiles') tileUpdates.push(status)
    })

    // Tiles step still fires loading+done (returns null gracefully — not an error)
    expect(tileUpdates).toContain('loading')
    expect(tileUpdates).toContain('done')
    // prefetchTiles should NOT be called when no coords
    expect(prefetchTiles).not.toHaveBeenCalled()
    expect(getTileUrlsWithDestinationDetail).not.toHaveBeenCalled()
  })

  it('continues on step failure (tiles error does not abort other steps)', async () => {
    vi.mocked(prefetchTiles).mockRejectedValueOnce(new Error('Network error'))

    const updates: Array<{ step: CacheStep; status: StepStatus }> = []
    await cacheTripData('trip-1', MOCK_EMERGENCY, (step, status) => {
      updates.push({ step, status })
    }, MOCK_COORDS)

    // All 8 steps should have been attempted
    const stepsAttempted = [...new Set(updates.map((u) => u.step))]
    expect(stepsAttempted).toHaveLength(8)

    // tiles step should have error status
    const tilesStatus = updates.find((u) => u.step === 'tiles' && u.status !== 'loading')
    expect(tilesStatus?.status).toBe('error')
  })

  it('saves snapshot to IndexedDB after all steps complete', async () => {
    await cacheTripData('trip-1', MOCK_EMERGENCY, vi.fn(), MOCK_COORDS)
    expect(saveTripSnapshot).toHaveBeenCalledTimes(1)
  })

  it('stores tile result as { count, failed } in snapshot (not URLs)', async () => {
    let savedSnapshot: unknown
    vi.mocked(saveTripSnapshot).mockImplementation(async (snap) => {
      savedSnapshot = snap
    })

    await cacheTripData('trip-1', MOCK_EMERGENCY, vi.fn(), MOCK_COORDS)

    const snap = savedSnapshot as Record<string, unknown>
    expect(snap['tiles']).toEqual({ count: 2, failed: 0 })
  })
})
