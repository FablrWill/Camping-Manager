import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveTripSnapshot, getTripSnapshot, deleteTripSnapshot, getCachedTripIds, getSnapshotAge } from '../offline-storage'

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  createStore: vi.fn(() => 'mock-store'),
}))

import { get, set, del, keys } from 'idb-keyval'

beforeEach(() => vi.clearAllMocks())

describe('offline-storage', () => {
  it('saveTripSnapshot stores data in IndexedDB', async () => {
    const snapshot = {
      tripId: 'trip-1',
      cachedAt: new Date().toISOString(),
      weather: null,
      packingList: null,
      mealPlan: null,
      departureChecklist: null,
      spots: [],
      emergencyInfo: { name: null, email: null },
      vehicleInfo: null,
    }
    await saveTripSnapshot(snapshot)
    expect(set).toHaveBeenCalledWith('trip:trip-1', snapshot, 'mock-store')
  })

  it('getTripSnapshot retrieves stored snapshot by tripId', async () => {
    const snapshot = { tripId: 'trip-1', cachedAt: '2024-01-01T00:00:00.000Z' }
    vi.mocked(get).mockResolvedValueOnce(snapshot)
    const result = await getTripSnapshot('trip-1')
    expect(get).toHaveBeenCalledWith('trip:trip-1', 'mock-store')
    expect(result).toEqual(snapshot)
  })

  it('getTripSnapshot returns undefined for missing tripId', async () => {
    vi.mocked(get).mockResolvedValueOnce(undefined)
    const result = await getTripSnapshot('no-such-trip')
    expect(result).toBeUndefined()
  })

  it('getCachedTripIds returns list of cached trip IDs', async () => {
    vi.mocked(keys).mockResolvedValueOnce(['trip:abc', 'trip:xyz', 'other-key'] as never)
    const ids = await getCachedTripIds()
    expect(ids).toEqual(['abc', 'xyz'])
  })

  it('deleteTripSnapshot removes a snapshot', async () => {
    await deleteTripSnapshot('trip-1')
    expect(del).toHaveBeenCalledWith('trip:trip-1', 'mock-store')
  })

  it('getSnapshotAge returns "just now" for recent snapshots', () => {
    const result = getSnapshotAge(new Date().toISOString())
    expect(result).toBe('just now')
  })

  it('getSnapshotAge returns relative time for older snapshots', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const result = getSnapshotAge(twoHoursAgo)
    expect(result).toBe('2h ago')
  })
})
