import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cacheTripData, CACHE_STEPS, CACHE_STEP_LABELS } from '../cache-trip'

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  createStore: vi.fn(() => 'mock-store'),
}))

vi.mock('../offline-storage', () => ({
  saveTripSnapshot: vi.fn().mockResolvedValue(undefined),
}))

import { saveTripSnapshot } from '../offline-storage'

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('cache-trip', () => {
  it('cacheTripData calls onStepUpdate for each step', async () => {
    const onStepUpdate = vi.fn()
    await cacheTripData('trip-1', { name: null, email: null }, onStepUpdate)
    // Each step gets loading + done calls
    expect(onStepUpdate).toHaveBeenCalledWith('weather', 'loading')
    expect(onStepUpdate).toHaveBeenCalledWith('weather', 'done')
    expect(onStepUpdate).toHaveBeenCalledWith('packingList', 'loading')
    expect(onStepUpdate).toHaveBeenCalledWith('packingList', 'done')
  })

  it('cacheTripData fetches all 7 data types', async () => {
    const onStepUpdate = vi.fn()
    await cacheTripData('trip-1', { name: null, email: null }, onStepUpdate)
    // All 7 steps should be called: weather, packingList, mealPlan, checklist, emergency, spots, vehicle
    const doneSteps = onStepUpdate.mock.calls
      .filter(([, status]) => status === 'done')
      .map(([step]) => step)
    // emergency with null name/email fetches settings — all 7 steps run
    expect(doneSteps).toHaveLength(7)
  })

  it('cacheTripData continues on step failure', async () => {
    const onStepUpdate = vi.fn()
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    await cacheTripData('trip-1', { name: null, email: null }, onStepUpdate)
    // First step fails, rest succeed
    expect(onStepUpdate).toHaveBeenCalledWith('weather', 'error')
    expect(onStepUpdate).toHaveBeenCalledWith('packingList', 'done')
  })

  it('cacheTripData saves snapshot to IndexedDB after all steps', async () => {
    const onStepUpdate = vi.fn()
    await cacheTripData('trip-1', { name: null, email: null }, onStepUpdate)
    expect(saveTripSnapshot).toHaveBeenCalledTimes(1)
  })

  it('CACHE_STEPS contains all 7 step names', () => {
    expect(CACHE_STEPS).toHaveLength(7)
    expect(CACHE_STEPS).toContain('weather')
    expect(CACHE_STEPS).toContain('packingList')
    expect(CACHE_STEPS).toContain('mealPlan')
    expect(CACHE_STEPS).toContain('checklist')
    expect(CACHE_STEPS).toContain('emergency')
    expect(CACHE_STEPS).toContain('spots')
    expect(CACHE_STEPS).toContain('vehicle')
  })

  it('CACHE_STEP_LABELS has labels for all steps', () => {
    for (const step of CACHE_STEPS) {
      expect(CACHE_STEP_LABELS[step]).toBeTruthy()
      expect(typeof CACHE_STEP_LABELS[step]).toBe('string')
    }
  })
})
