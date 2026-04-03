import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
    },
    departureChecklist: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/claude', () => ({
  generateDepartureChecklist: vi.fn(),
}))

vi.mock('@/lib/overpass', () => ({
  fetchLastStops: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { generateDepartureChecklist } from '@/lib/claude'
import { fetchLastStops } from '@/lib/overpass'
import { POST } from '@/app/api/departure-checklist/route'
import { NextRequest } from 'next/server'

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/departure-checklist', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockChecklistResult = {
  slots: [
    {
      label: 'Night Before',
      items: [
        { id: 'chk-0-0', text: 'Pack gear', checked: false, isUnpackedWarning: false, suggestedTime: '9:00 PM Thu' },
      ],
    },
  ],
}

const mockTripWithLocation = {
  id: 'trip-1',
  name: 'Weekend at Linville Gorge',
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-05-03'),
  departureTime: new Date('2026-05-01T07:00:00.000Z'),
  notes: null,
  weatherNotes: null,
  currentBatteryPct: null,
  location: { latitude: 35.9, longitude: -81.9 },
  packingItems: [
    {
      packed: true,
      gear: { name: 'Sleeping bag', category: 'Sleep' },
    },
  ],
  mealPlan: null,
  vehicle: { name: 'Santa Fe', mods: [] },
}

const mockTripWithoutLocation = {
  ...mockTripWithLocation,
  id: 'trip-2',
  location: null,
  departureTime: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'

  vi.mocked(prisma.departureChecklist.upsert).mockResolvedValue({
    id: 'checklist-1',
    tripId: 'trip-1',
    result: JSON.stringify(mockChecklistResult),
    generatedAt: new Date('2026-04-03T12:00:00.000Z'),
  } as never)

  vi.mocked(generateDepartureChecklist).mockResolvedValue(mockChecklistResult)
})

describe('POST /api/departure-checklist', () => {
  it('Test 1: fetches fuel stops and passes stop names to generateDepartureChecklist when trip has location coordinates', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithLocation as never)
    vi.mocked(fetchLastStops).mockResolvedValue({
      fuel: [{ name: 'Shell', distanceMiles: 7.5, category: 'fuel' }],
      grocery: [{ name: 'Food Lion', distanceMiles: 8.7, category: 'grocery' }],
      outdoor: [{ name: 'Lowes Hardware', distanceMiles: 9.3, category: 'outdoor' }],
    })

    const req = makePostRequest({ tripId: 'trip-1' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(fetchLastStops).toHaveBeenCalledWith(35.9, -81.9)

    const callArgs = vi.mocked(generateDepartureChecklist).mock.calls[0][0]
    expect(callArgs.lastStopNames).toContain('Shell')
    expect(callArgs.lastStopNames).toContain('Food Lion')
    expect(callArgs.lastStopNames).toContain('Lowes Hardware')
  })

  it('Test 2: does NOT call fetchLastStops when trip has no location coordinates, passes empty lastStopNames', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithoutLocation as never)

    const req = makePostRequest({ tripId: 'trip-2' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(fetchLastStops).not.toHaveBeenCalled()

    const callArgs = vi.mocked(generateDepartureChecklist).mock.calls[0][0]
    expect(callArgs.lastStopNames).toEqual([])
  })

  it('Test 3: Overpass failure is non-blocking — checklist still generates with empty lastStopNames', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithLocation as never)
    vi.mocked(fetchLastStops).mockRejectedValue(new Error('Overpass timeout'))

    const req = makePostRequest({ tripId: 'trip-1' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(generateDepartureChecklist).toHaveBeenCalled()
    const callArgs = vi.mocked(generateDepartureChecklist).mock.calls[0][0]
    expect(callArgs.lastStopNames).toEqual([])
  })

  it('Test 4: passes formatted departureTime string to generateDepartureChecklist when trip.departureTime is set', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithLocation as never)
    vi.mocked(fetchLastStops).mockResolvedValue({ fuel: [], grocery: [], outdoor: [] })

    const req = makePostRequest({ tripId: 'trip-1' })
    await POST(req)

    const callArgs = vi.mocked(generateDepartureChecklist).mock.calls[0][0]
    // departureTime should be a non-null string (human-readable formatted)
    expect(callArgs.departureTime).toBeTypeOf('string')
    expect(callArgs.departureTime).not.toBeNull()
    expect(callArgs.departureTime!.length).toBeGreaterThan(0)
  })

  it('Test 5: passes departureTime as null when trip.departureTime is null', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithoutLocation as never)

    const req = makePostRequest({ tripId: 'trip-2' })
    await POST(req)

    const callArgs = vi.mocked(generateDepartureChecklist).mock.calls[0][0]
    expect(callArgs.departureTime).toBeNull()
  })
})
