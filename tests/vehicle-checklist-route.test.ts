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
import { NextRequest } from 'next/server'

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/vehicle-checklist', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makePatchRequest(tripId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/vehicle-checklist/${tripId}/check`, {
    method: 'PATCH',
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

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  vi.mocked(generateVehicleChecklist).mockResolvedValue(mockChecklistResult)
  vi.mocked(prisma.trip.update).mockResolvedValue({
    ...mockTripWithVehicle,
    vehicleChecklistResult: JSON.stringify(mockChecklistResult),
    vehicleChecklistGeneratedAt: new Date(),
  } as never)
})

describe('POST /api/vehicle-checklist', () => {
  it('Test 1: calls generateVehicleChecklist with vehicle specs and trip context when vehicle is assigned', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripWithVehicle as never)

    // Route file does not exist yet (Plan 02 will create it) — RED state
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST } = require('@/app/api/vehicle-checklist/route')
    const req = makePostRequest({ tripId: 'trip-1' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(generateVehicleChecklist).toHaveBeenCalledOnce()

    const callArgs = vi.mocked(generateVehicleChecklist).mock.calls[0][0]
    // Vehicle specs
    expect(callArgs).toMatchObject(
      expect.objectContaining({
        year: 2022,
        make: 'Hyundai',
        model: 'Santa Fe Hybrid',
        drivetrain: 'AWD',
        groundClearance: 8.0,
      })
    )
    // Trip context
    expect(callArgs).toMatchObject(
      expect.objectContaining({
        destinationName: 'Linville Gorge',
        roadCondition: 'dirt',
        clearanceNeeded: 'high',
      })
    )
  })

  it('Test 2: returns 400 when trip has no vehicle assigned', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(mockTripNoVehicle as never)

    // Route file does not exist yet (Plan 02 will create it) — RED state
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST } = require('@/app/api/vehicle-checklist/route')
    const req = makePostRequest({ tripId: 'trip-2' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no vehicle/i)
  })
})

describe('PATCH /api/vehicle-checklist/[tripId]/check', () => {
  it('Test 3: updates checked state for an existing item and returns success', async () => {
    const tripWithChecklist = {
      ...mockTripWithVehicle,
      vehicleChecklistResult: JSON.stringify(mockChecklistResult),
    }
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(tripWithChecklist as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma))

    // Route file does not exist yet (Plan 02 will create it) — RED state
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PATCH } = require('@/app/api/vehicle-checklist/[tripId]/check/route')
    const req = makePatchRequest('trip-1', { itemId: 'vc-0', checked: true })
    const res = await PATCH(req, { params: Promise.resolve({ tripId: 'trip-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('Test 4: returns 400 when itemId does not exist in checklist', async () => {
    const tripWithChecklist = {
      ...mockTripWithVehicle,
      vehicleChecklistResult: JSON.stringify(mockChecklistResult),
    }
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(tripWithChecklist as never)

    // Route file does not exist yet (Plan 02 will create it) — RED state
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PATCH } = require('@/app/api/vehicle-checklist/[tripId]/check/route')
    const req = makePatchRequest('trip-1', { itemId: 'vc-999', checked: true })
    const res = await PATCH(req, { params: Promise.resolve({ tripId: 'trip-1' }) })

    expect(res.status).toBe(400)
  })
})
