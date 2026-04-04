import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    gearItem: {
      findUnique: vi.fn(),
    },
    gearPriceCheck: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/claude', () => ({
  generateGearPriceCheck: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { generateGearPriceCheck } from '@/lib/claude'
import { NextRequest } from 'next/server'

function makeRequest(url: string, method: string): NextRequest {
  return new NextRequest(url, { method })
}

const mockGearItem = {
  id: 'gear-1',
  name: 'Camp Stove',
  brand: 'MSR',
  modelNumber: 'PocketRocket',
  category: 'cooking',
  price: 45.0,
  targetPrice: 100.0,
}

const mockPriceCheckResult = {
  foundPriceRange: '$89-109',
  foundPriceLow: 89.0,
  retailers: ['REI', 'Amazon'],
  disclaimer: 'Prices based on training data -- may be outdated.',
}

const mockSavedPriceCheck = {
  id: 'price-check-1',
  gearItemId: 'gear-1',
  foundPriceRange: '$89-109',
  foundPriceLow: 89.0,
  checkedAt: new Date('2026-04-04T06:00:00.000Z'),
  isAtOrBelowTarget: true,
  createdAt: new Date('2026-04-04T06:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  vi.mocked(generateGearPriceCheck).mockResolvedValue(mockPriceCheckResult)
  vi.mocked(prisma.gearPriceCheck.upsert).mockResolvedValue(mockSavedPriceCheck as never)
})

describe('GET /api/gear/[id]/price-check', () => {
  it('Test 1: returns 404 when no price check exists', async () => {
    vi.mocked(prisma.gearPriceCheck.findUnique).mockResolvedValue(null)

    const { GET } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('No price check found')
  })

  it('Test 2: returns 200 with stored price check data', async () => {
    vi.mocked(prisma.gearPriceCheck.findUnique).mockResolvedValue(mockSavedPriceCheck as never)

    const { GET } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.id).toBe('price-check-1')
    expect(body.foundPriceRange).toBe('$89-109')
    expect(body.isAtOrBelowTarget).toBe(true)
  })
})

describe('POST /api/gear/[id]/price-check', () => {
  it('Test 3: returns 404 when gear item does not exist', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(null)

    const { POST } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-999/price-check', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-999' }) })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('Gear item not found')
  })

  it('Test 4: calls generateGearPriceCheck and upserts result', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(mockGearItem as never)

    const { POST } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(200)

    expect(generateGearPriceCheck).toHaveBeenCalledOnce()
    expect(prisma.gearPriceCheck.upsert).toHaveBeenCalledOnce()

    const body = await res.json()
    expect(body.id).toBe('price-check-1')
    expect(body.foundPriceRange).toBe('$89-109')
  })

  it('Test 5: computes isAtOrBelowTarget=true when foundPriceLow (89) <= targetPrice (100)', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(mockGearItem as never)

    const { POST } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'POST')
    await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })

    const upsertCall = vi.mocked(prisma.gearPriceCheck.upsert).mock.calls[0][0]
    expect(upsertCall.create.isAtOrBelowTarget).toBe(true)
    expect(upsertCall.update.isAtOrBelowTarget).toBe(true)
  })

  it('Test 6: computes isAtOrBelowTarget=false when targetPrice is null', async () => {
    const gearItemNoTarget = { ...mockGearItem, targetPrice: null }
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(gearItemNoTarget as never)
    const savedNoTarget = { ...mockSavedPriceCheck, isAtOrBelowTarget: false }
    vi.mocked(prisma.gearPriceCheck.upsert).mockResolvedValue(savedNoTarget as never)

    const { POST } = await import('@/app/api/gear/[id]/price-check/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'POST')
    await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })

    const upsertCall = vi.mocked(prisma.gearPriceCheck.upsert).mock.calls[0][0]
    expect(upsertCall.create.isAtOrBelowTarget).toBe(false)
    expect(upsertCall.update.isAtOrBelowTarget).toBe(false)
  })
})
