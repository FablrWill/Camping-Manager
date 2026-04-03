import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/overpass', () => ({
  fetchLastStops: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { fetchLastStops } from '@/lib/overpass'
import { GET } from '@/app/api/trips/[id]/last-stops/route'
import { NextRequest } from 'next/server'

function makeRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/trips/${id}/last-stops`)
  const params = Promise.resolve({ id })
  return [req, { params }]
}

describe('GET /api/trips/[id]/last-stops', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 200 with last stops when trip has location coordinates', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      id: 'trip-1',
      location: { latitude: 35.5951, longitude: -82.5515 },
    } as never)

    vi.mocked(fetchLastStops).mockResolvedValue({
      fuel: [{ name: 'Shell', distanceMiles: 2.3, category: 'fuel' }],
      grocery: [{ name: 'Walmart', distanceMiles: 3.1, category: 'grocery' }],
      outdoor: [{ name: 'REI', distanceMiles: 4.5, category: 'outdoor' }],
    })

    const [req, ctx] = makeRequest('trip-1')
    const res = await GET(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.fuel).toHaveLength(1)
    expect(body.fuel[0].name).toBe('Shell')
    expect(body.grocery[0].name).toBe('Walmart')
    expect(body.outdoor[0].name).toBe('REI')
    expect(fetchLastStops).toHaveBeenCalledWith(35.5951, -82.5515)
  })

  it('returns 200 with empty arrays when trip has no location', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      id: 'trip-2',
      location: null,
    } as never)

    const [req, ctx] = makeRequest('trip-2')
    const res = await GET(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ fuel: [], grocery: [], outdoor: [] })
    expect(fetchLastStops).not.toHaveBeenCalled()
  })

  it('returns 404 when trip is not found', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null)

    const [req, ctx] = makeRequest('nonexistent')
    const res = await GET(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Trip not found')
  })

  it('returns 500 when fetchLastStops throws', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      id: 'trip-3',
      location: { latitude: 35.5951, longitude: -82.5515 },
    } as never)

    vi.mocked(fetchLastStops).mockRejectedValue(new Error('Overpass timeout'))

    const [req, ctx] = makeRequest('trip-3')
    const res = await GET(req, ctx)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to fetch last stops')
  })
})
