import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/trips/[id]/review/route'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    packingItem: {
      update: vi.fn(),
    },
    mealFeedback: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    location: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'

const mockTripFindUnique = vi.mocked(prisma.trip.findUnique)
const mockTransaction = vi.mocked(prisma.$transaction)

function makeReq(tripId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/trips/${tripId}/review`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  gearUsage: [{ gearId: 'gear-1', usageStatus: 'used' }],
  mealFeedbacks: [],
  spotRating: 4,
  spotNote: 'Great spot',
  tripNotes: 'Had a blast',
}

describe('POST /api/trips/[id]/review — Batch Review (REV-03 through REV-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- 404 ----

  it('returns 404 when trip does not exist', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue(null)
    const req = makeReq('missing-trip', validBody)
    const res = await POST(req, { params: Promise.resolve({ id: 'missing-trip' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/i)
  })

  // ---- 409 idempotency ----

  it('returns 409 when trip.reviewedAt is already set', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: new Date('2026-04-01T12:00:00Z'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const req = makeReq('trip-1', validBody)
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already reviewed/i)
  })

  // ---- 400 validation ----

  it('returns 400 when gearUsage is not an array', async () => {
    // POST imported at top of file
    const req = makeReq('trip-1', { ...validBody, gearUsage: 'bad' })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 when a gearUsage entry has an invalid usageStatus', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const req = makeReq('trip-1', {
      ...validBody,
      gearUsage: [{ gearId: 'gear-1', usageStatus: 'destroyed' }],
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(400)
  })

  // ---- REV-03: gear usage ----

  it('REV-03: updates PackingItem.usageStatus for each gearUsage entry', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // Mock transaction to call the callback with a tx object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txPackingItemUpdate = vi.fn().mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: txPackingItemUpdate },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: vi.fn() },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [
        { gearId: 'gear-1', usageStatus: 'used' },
        { gearId: 'gear-2', usageStatus: "didn't need" },
      ],
      mealFeedbacks: [],
      spotRating: null,
      spotNote: null,
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txPackingItemUpdate).toHaveBeenCalledTimes(2)
    expect(txPackingItemUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-1' } },
      data: { usageStatus: 'used' },
    }))
    expect(txPackingItemUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-2' } },
      data: { usageStatus: "didn't need" },
    }))
  })

  it('REV-03: gear items NOT in gearUsage are not touched (no updateMany wipe)', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txPackingItemUpdate = vi.fn().mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: txPackingItemUpdate },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: vi.fn() },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [{ gearId: 'gear-1', usageStatus: 'used' }],
      mealFeedbacks: [],
      spotRating: null,
      spotNote: null,
      tripNotes: null,
    })
    await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    // Only called once — gear-2 not touched
    expect(txPackingItemUpdate).toHaveBeenCalledTimes(1)
    expect(txPackingItemUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
      where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-2' } },
    }))
  })

  // ---- REV-04: meal feedbacks ----

  it('REV-04: creates MealFeedback when no existing record found', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const txFindFirst = vi.fn().mockResolvedValue(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txCreate = vi.fn().mockResolvedValue({ id: 'fb-1' } as any)
    const txUpdate = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: txFindFirst, create: txCreate, update: txUpdate },
      location: { update: vi.fn() },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [{ mealId: 'meal-1', mealPlanId: 'mp-1', mealName: 'Tacos', rating: 'liked', notes: 'Delicious' }],
      spotRating: null,
      spotNote: null,
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txFindFirst).toHaveBeenCalledWith({ where: { mealId: 'meal-1', mealPlanId: 'mp-1' } })
    expect(txCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ mealId: 'meal-1', mealPlanId: 'mp-1', mealName: 'Tacos', rating: 'liked', notes: 'Delicious' }),
    }))
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('REV-04: updates existing MealFeedback when record found', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txFindFirst = vi.fn().mockResolvedValue({ id: 'fb-existing' } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txUpdate = vi.fn().mockResolvedValue({ id: 'fb-existing' } as any)
    const txCreate = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: txFindFirst, create: txCreate, update: txUpdate },
      location: { update: vi.fn() },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [{ mealId: 'meal-1', mealPlanId: 'mp-1', mealName: 'Tacos', rating: 'disliked' }],
      spotRating: null,
      spotNote: null,
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'fb-existing' },
      data: expect.objectContaining({ rating: 'disliked', mealName: 'Tacos' }),
    }))
    expect(txCreate).not.toHaveBeenCalled()
  })

  // ---- REV-05: spot rating ----

  it('REV-05: updates Location.rating when spotRating is provided and trip.locationId is set', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: 'loc-1',
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txLocationUpdate = vi.fn().mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: txLocationUpdate },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [],
      spotRating: 5,
      spotNote: 'Amazing views',
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txLocationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'loc-1' },
      data: expect.objectContaining({ rating: 5, notes: 'Amazing views' }),
    }))
  })

  it('REV-05: skips location update when trip.locationId is null', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txLocationUpdate = vi.fn().mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: txLocationUpdate },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [],
      spotRating: 5,
      spotNote: 'Great',
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txLocationUpdate).not.toHaveBeenCalled()
  })

  it('REV-05: skips location update when spotRating is null', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: 'loc-1',
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txLocationUpdate = vi.fn().mockResolvedValue({} as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: txLocationUpdate },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [],
      spotRating: null,
      spotNote: null,
      tripNotes: null,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    expect(txLocationUpdate).not.toHaveBeenCalled()
  })

  // ---- REV-06: reviewedAt and tripNotes ----

  it('REV-06: sets Trip.reviewedAt and replaces Trip.notes on success', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const reviewedAt = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txTripUpdate = vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt } as any)
    const mockTx = {
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: vi.fn() },
      trip: { update: txTripUpdate },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTx))

    const req = makeReq('trip-1', {
      gearUsage: [],
      mealFeedbacks: [],
      spotRating: null,
      spotNote: null,
      tripNotes: 'Best trip ever',
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.reviewedAt).toBeDefined()
    expect(txTripUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'trip-1' },
      data: expect.objectContaining({
        notes: 'Best trip ever',
        reviewedAt: expect.any(Date),
      }),
    }))
  })

  it('REV-06: all writes happen inside prisma.$transaction', async () => {
    // POST imported at top of file
    mockTripFindUnique.mockResolvedValue({
      id: 'trip-1',
      locationId: null,
      reviewedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTransaction.mockImplementation(async (fn: any) => fn({
      packingItem: { update: vi.fn().mockResolvedValue({}) },
      mealFeedback: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      location: { update: vi.fn() },
      trip: { update: vi.fn().mockResolvedValue({ id: 'trip-1', reviewedAt: new Date() }) },
    }))

    const req = makeReq('trip-1', validBody)
    await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
    expect(mockTransaction).toHaveBeenCalledOnce()
  })
})
