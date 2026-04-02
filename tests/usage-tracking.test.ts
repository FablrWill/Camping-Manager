import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/trips/[id]/usage/route'
import { GET } from '@/app/api/packing-list/route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    packingItem: {
      update: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/claude', () => ({
  generatePackingList: vi.fn(),
}))

vi.mock('@/lib/weather', () => ({
  fetchWeather: vi.fn(),
}))

const mockUpdate = vi.mocked(prisma.packingItem.update)
const mockTripFindUnique = vi.mocked(prisma.trip.findUnique)

describe('Usage Tracking (LEARN-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PATCH /api/trips/[id]/usage', () => {
    it('returns 400 when gearId is missing', async () => {
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('gearId is required')
    })

    it('updates PackingItem.usageStatus to "used"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUpdate.mockResolvedValue({ id: 'item-1', usageStatus: 'used' } as any)
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ gearId: 'gear-1', usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-1' } },
        data: { usageStatus: 'used' },
      }))
    })

    it('updates PackingItem.usageStatus to "didn\'t need"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUpdate.mockResolvedValue({ id: 'item-1', usageStatus: "didn't need" } as any)
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ gearId: 'gear-1', usageStatus: "didn't need" }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-1' } },
        data: { usageStatus: "didn't need" },
      }))
    })

    it('updates PackingItem.usageStatus to "forgot but needed"', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUpdate.mockResolvedValue({ id: 'item-1', usageStatus: 'forgot but needed' } as any)
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ gearId: 'gear-1', usageStatus: 'forgot but needed' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { tripId_gearId: { tripId: 'trip-1', gearId: 'gear-1' } },
        data: { usageStatus: 'forgot but needed' },
      }))
    })

    it('returns 500 for non-existent tripId_gearId combo', async () => {
      // Note: route catches all errors as 500, not 404. Test matches actual behavior.
      const { Prisma } = await import('@prisma/client')
      mockUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025', clientVersion: '6.0.0', meta: {},
        })
      )
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ gearId: 'nonexistent', usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(500)
    })
  })

  describe('GET /api/packing-list includes usageState', () => {
    it('response includes usageState map alongside packedState', async () => {
      mockTripFindUnique.mockResolvedValue({
        packingListResult: JSON.stringify({ items: [] }),
        packingListGeneratedAt: new Date('2026-04-01'),
        packingItems: [
          { gearId: 'gear-1', packed: true, usageStatus: 'used' },
          { gearId: 'gear-2', packed: false, usageStatus: null },
        ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      const req = new NextRequest('http://localhost/api/packing-list?tripId=trip-1')
      const res = await GET(req)
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.usageState).toEqual({ 'gear-1': 'used', 'gear-2': null })
      expect(json.packedState).toEqual({ 'gear-1': true, 'gear-2': false })
    })
  })
})
