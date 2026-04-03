import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { PATCH } from '@/app/api/trips/[id]/route'
import { NextRequest } from 'next/server'

function makeRequest(id: string, body: unknown): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/trips/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const params = Promise.resolve({ id })
  return [req, { params }]
}

describe('PATCH /api/trips/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 200 with departureTime as ISO string for valid date input', async () => {
    const isoDate = '2026-04-18T07:00:00'
    vi.mocked(prisma.trip.update).mockResolvedValue({
      id: 'trip-1',
      departureTime: new Date(isoDate),
    } as never)

    const [req, ctx] = makeRequest('trip-1', { departureTime: isoDate })
    const res = await PATCH(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.departureTime).toBe(new Date(isoDate).toISOString())
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trip-1' },
        data: { departureTime: new Date(isoDate) },
      }),
    )
  })

  it('returns 200 with departureTime as null when cleared', async () => {
    vi.mocked(prisma.trip.update).mockResolvedValue({
      id: 'trip-2',
      departureTime: null,
    } as never)

    const [req, ctx] = makeRequest('trip-2', { departureTime: null })
    const res = await PATCH(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.departureTime).toBeNull()
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'trip-2' },
        data: { departureTime: null },
      }),
    )
  })

  it('returns 404 when trip is not found', async () => {
    const p2025Error = Object.assign(new Error('Record not found'), { code: 'P2025' })
    vi.mocked(prisma.trip.update).mockRejectedValue(p2025Error)

    const [req, ctx] = makeRequest('nonexistent', { departureTime: '2026-04-18T07:00:00' })
    const res = await PATCH(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Trip not found')
  })
})
