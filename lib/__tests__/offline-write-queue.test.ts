import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before vi.mock factory runs
const { mockSet, mockGet, mockDel, mockKeys, mockCreateStore, mockStore } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  const mockSet = vi.fn(async (key: string, value: unknown, _storeRef: unknown) => {
    store[key] = value
  })
  const mockGet = vi.fn(async (key: string, _storeRef: unknown) => store[key])
  const mockDel = vi.fn(async (key: string, _storeRef: unknown) => {
    delete store[key]
  })
  const mockKeys = vi.fn(async (_storeRef: unknown) => Object.keys(store))
  const mockCreateStore = vi.fn(() => 'mock-store')
  return { mockSet, mockGet, mockDel, mockKeys, mockCreateStore, mockStore: store }
})

vi.mock('idb-keyval', () => ({
  set: mockSet,
  get: mockGet,
  del: mockDel,
  keys: mockKeys,
  createStore: mockCreateStore,
}))

import {
  queueCheckOff,
  getPendingWrites,
  removeWrite,
  clearQueue,
  type QueuedWrite,
} from '../offline-write-queue'

describe('offline-write-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock store state
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key]
    }
    // Re-bind mock implementations after clearAllMocks
    mockSet.mockImplementation(async (key: string, value: unknown) => {
      mockStore[key] = value
    })
    mockGet.mockImplementation(async (key: string) => mockStore[key])
    mockDel.mockImplementation(async (key: string) => {
      delete mockStore[key]
    })
    mockKeys.mockImplementation(async () => Object.keys(mockStore))
    mockCreateStore.mockReturnValue('mock-store')
  })

  it('queueCheckOff passes the store handle returned by createStore to idb-keyval set', async () => {
    // createStore('outland-queue', 'writes') returns 'mock-store'
    // Verify that the queue module uses this store handle for all operations
    await queueCheckOff('cl-test', 'item-test', true)
    const setCall = mockSet.mock.calls[0]
    // Third argument should be the store handle returned by createStore
    expect(setCall[2]).toBe('mock-store')
  })

  it('queueCheckOff calls set with key check:${checklistId}:${itemId}', async () => {
    await queueCheckOff('checklist-123', 'item-456', true)
    expect(mockSet).toHaveBeenCalledWith(
      'check:checklist-123:item-456',
      expect.objectContaining({
        id: 'check:checklist-123:item-456',
        checklistId: 'checklist-123',
        itemId: 'item-456',
        checked: true,
      }),
      'mock-store'
    )
  })

  it('queueCheckOff stores QueuedWrite with correct fields', async () => {
    await queueCheckOff('cl1', 'item1', false)

    const call = mockSet.mock.calls[0]
    const write: QueuedWrite = call[1] as QueuedWrite
    expect(write.id).toBe('check:cl1:item1')
    expect(write.checklistId).toBe('cl1')
    expect(write.itemId).toBe('item1')
    expect(write.checked).toBe(false)
    expect(write.queuedAt).toBeDefined()
    // queuedAt should be an ISO timestamp
    expect(() => new Date(write.queuedAt).toISOString()).not.toThrow()
  })

  it('getPendingWrites returns all queued writes', async () => {
    const w1: QueuedWrite = {
      id: 'check:cl1:item1',
      checklistId: 'cl1',
      itemId: 'item1',
      checked: true,
      queuedAt: new Date().toISOString(),
    }
    const w2: QueuedWrite = {
      id: 'check:cl2:item2',
      checklistId: 'cl2',
      itemId: 'item2',
      checked: false,
      queuedAt: new Date().toISOString(),
    }
    mockStore['check:cl1:item1'] = w1
    mockStore['check:cl2:item2'] = w2

    const writes = await getPendingWrites()
    expect(writes).toHaveLength(2)
    expect(writes).toContainEqual(w1)
    expect(writes).toContainEqual(w2)
  })

  it('removeWrite calls del with the write id', async () => {
    await removeWrite('check:cl1:item1')
    expect(mockDel).toHaveBeenCalledWith('check:cl1:item1', 'mock-store')
  })

  it('clearQueue deletes all keys from the queue', async () => {
    mockStore['check:cl1:item1'] = { id: 'check:cl1:item1' }
    mockStore['check:cl2:item2'] = { id: 'check:cl2:item2' }

    await clearQueue()

    expect(mockDel).toHaveBeenCalledWith('check:cl1:item1', 'mock-store')
    expect(mockDel).toHaveBeenCalledWith('check:cl2:item2', 'mock-store')
    expect(mockDel).toHaveBeenCalledTimes(2)
  })
})
