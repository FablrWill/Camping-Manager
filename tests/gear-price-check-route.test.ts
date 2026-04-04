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
import { GET, POST } from '@/app/api/gear/[id]/price-check/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, method: string): NextRequest {
  return new NextRequest(url, { method })
}

const mockGearItem = {
  id: 'gear-1',
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  modelNumber: 'TCSHV221',
  category: 'shelter',
  price: 499.95,
  targetPrice: 350.00,
  isWishlist: true,
}

const mockPriceCheckResult = {
  foundPriceRange: '$380 – $500',
  foundPriceLow: 380,
  retailers: ['REI', 'Amazon', 'Backcountry'],
  disclaimer: 'Prices based on training data and may not reflect current promotions.',
}

const mockSavedPriceCheck = {
  id: 'pc-1',
  gearItemId: 'gear-1',
  foundPriceRange: '$380 – $500',
  foundPriceLow: 380,
  retailers: '["REI","Amazon","Backcountry"]',
  disclaimer: 'Prices based on training data and may not reflect current promotions.',
  isAtOrBelowTarget: false,
  checkedAt: new Date('2026-04-04T12:00:00.000Z'),
  createdAt: new Date('2026-04-04T12:00:00.000Z'),
  updatedAt: new Date('2026-04-04T12:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

describe('GET /api/gear/[id]/price-check', () => {
  it('Test 1: returns 404 when no price check exists', async () => {
    vi.mocked(prisma.gearPriceCheck.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Price check not found')
  })

  it('Test 2: returns saved price check when it exists', async () => {
    vi.mocked(prisma.gearPriceCheck.findUnique).mockResolvedValue(mockSavedPriceCheck as never)

    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gearItemId).toBe('gear-1')
    expect(body.foundPriceRange).toBe('$380 – $500')
  })
})

describe('POST /api/gear/[id]/price-check', () => {
  it('Test 3: returns 404 when gear item does not exist', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/gear/gear-999/price-check', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-999' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Gear item not found')
    expect(generateGearPriceCheck).not.toHaveBeenCalled()
  })

  it('Test 4: isAtOrBelowTarget is false when foundPriceLow is above targetPrice', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(mockGearItem as never)
    vi.mocked(generateGearPriceCheck).mockResolvedValue({ success: true, data: mockPriceCheckResult })
    vi.mocked(prisma.gearPriceCheck.upsert).mockResolvedValue({
      ...mockSavedPriceCheck,
      isAtOrBelowTarget: false,
    } as never)

    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })

    expect(res.status).toBe(200)
    expect(prisma.gearPriceCheck.upsert).toHaveBeenCalledOnce()
    const upsertCall = vi.mocked(prisma.gearPriceCheck.upsert).mock.calls[0][0]
    // foundPriceLow=380 > targetPrice=350, so isAtOrBelowTarget=false
    expect(upsertCall.create.isAtOrBelowTarget).toBe(false)
  })

  it('Test 5: isAtOrBelowTarget is true when foundPriceLow is at or below targetPrice', async () => {
    const dealItem = { ...mockGearItem, targetPrice: 400 } // foundPriceLow=380 <= 400
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(dealItem as never)
    vi.mocked(generateGearPriceCheck).mockResolvedValue({ success: true, data: mockPriceCheckResult })
    vi.mocked(prisma.gearPriceCheck.upsert).mockResolvedValue({
      ...mockSavedPriceCheck,
      isAtOrBelowTarget: true,
    } as never)

    const req = makeRequest('http://localhost/api/gear/gear-1/price-check', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })

    expect(res.status).toBe(200)
    const upsertCall = vi.mocked(prisma.gearPriceCheck.upsert).mock.calls[0][0]
    expect(upsertCall.create.isAtOrBelowTarget).toBe(true)
  })
})
