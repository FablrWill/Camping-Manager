import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/claude', () => ({
  generateVehicleChecklist: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { generateVehicleChecklist } from '@/lib/claude'
import { POST } from '@/app/api/vehicle-checklist/route'
import { PATCH } from '@/app/api/vehicle-checklist/[tripId]/check/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, method: string, body: object): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockChecklistResult = {
  items: [
    { id: 'vc-0', text: 'Check tire pressure (all four + spare)', checked: false },
    { id: 'vc-1', text: 'Verify oil level on dipstick', checked: false },
  ],
}

const mockTripWithVehicle = {
  id: 'trip-1',
  name: 'Weekend at Linville Gorge',
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-05-03'),
  vehicleChecklistResult: null,
  vehicleChecklistGeneratedAt: null,
  location: { name: 'Linville Gorge', roadCondition: 'dirt', clearanceNeeded: 'high' },
  vehicle: {
    id: 'v-1',
    year: 2022,
    make: 'Hyundai',
    model: 'Santa Fe Hybrid',
    drivetrain: 'AWD',
    groundClearance: 8.0,
  },
}

const mockTripNoVehicle = {
  ...mockTripWithVehicle,
  id: 'trip-2',
  vehicle: null,
  vehicleId: null,
}

const mockTripWithChecklist = {
  ...mockTripWithVehicle,
  vehicleChecklistResult: JSON.stringify(mockChecklistResult),
  vehicleChecklistGeneratedAt: new Date('2026-05-01T10:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'

  vi.mocked(generateVehicleChecklist).mockResolvedValue(mockChecklistResult)
  vi.mocked(prisma.trip.update).mockResolvedValue({} as never)
})

describe('POST /api/vehicle-checklist', () => {
  it('Test 1: calls generateVehicleChecklist with vehicle specs and trip context', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithVehicle as never)

    const req = makeRequest('http://localhost/api/vehicle-checklist', 'POST', { tripId: 'trip-1' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(generateVehicleChecklist).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(generateVehicleChecklist).mock.calls[0][0]
    expect(callArgs.vehicleYear).toBe(2022)
    expect(callArgs.vehicleMake).toBe('Hyundai')
    expect(callArgs.vehicleModel).toBe('Santa Fe Hybrid')
    expect(callArgs.drivetrain).toBe('AWD')
    expect(callArgs.groundClearance).toBe(8.0)
    expect(callArgs.destinationName).toBe('Linville Gorge')
    expect(callArgs.roadCondition).toBe('dirt')
    expect(callArgs.clearanceNeeded).toBe('high')
    expect(callArgs.tripDays).toBeGreaterThanOrEqual(1)
  })

  it('Test 2: returns 400 when trip has no vehicle assigned', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripNoVehicle as never)

    const req = makeRequest('http://localhost/api/vehicle-checklist', 'POST', { tripId: 'trip-2' })
    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBe('No vehicle assigned to this trip')
    expect(generateVehicleChecklist).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/vehicle-checklist/[tripId]/check', () => {
  it('Test 3: toggles item checked state and returns success', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithChecklist as never)
      return fn(prisma)
    })

    const req = makeRequest(
      'http://localhost/api/vehicle-checklist/trip-1/check',
      'PATCH',
      { itemId: 'vc-0', checked: true }
    )
    const res = await PATCH(req, { params: Promise.resolve({ tripId: 'trip-1' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('Test 4: returns 400 when itemId does not exist in checklist', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithChecklist as never)
      return fn(prisma)
    })

    const req = makeRequest(
      'http://localhost/api/vehicle-checklist/trip-1/check',
      'PATCH',
      { itemId: 'vc-999', checked: true }
    )
    const res = await PATCH(req, { params: Promise.resolve({ tripId: 'trip-1' }) })
    expect(res.status).toBe(400)
  })
})
