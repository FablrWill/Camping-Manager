import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    gearItem: {
      findUnique: vi.fn(),
    },
    gearResearch: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/claude', () => ({
  generateGearResearch: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { generateGearResearch } from '@/lib/claude'
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
  condition: 'good',
  price: 45.0,
}

const mockResearchResult = {
  verdict: 'Worth upgrading' as const,
  alternatives: [
    {
      name: 'Jetboil Flash',
      brand: 'Jetboil',
      priceRange: '$100-120',
      pros: ['Faster boil'],
      cons: ['Heavier'],
      reason: 'Best for speed',
    },
  ],
  summary: 'Consider upgrading for better performance.',
  priceDisclaimer: 'Prices may be outdated.',
}

const mockSavedResearch = {
  id: 'research-1',
  gearItemId: 'gear-1',
  result: JSON.stringify(mockResearchResult),
  verdict: 'Worth upgrading',
  researchedAt: new Date('2026-04-01T10:00:00.000Z'),
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  vi.mocked(generateGearResearch).mockResolvedValue(mockResearchResult)
  vi.mocked(prisma.gearResearch.upsert).mockResolvedValue(mockSavedResearch as never)
})

describe('POST /api/gear/[id]/research', () => {
  it('Test 1: returns 404 when gear item does not exist', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(null)

    const { POST } = await import('@/app/api/gear/[id]/research/route')
    const req = makeRequest('http://localhost/api/gear/gear-999/research', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-999' }) })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('Gear item not found')
  })

  it('Test 2: calls generateGearResearch and returns result with id and researchedAt', async () => {
    vi.mocked(prisma.gearItem.findUnique).mockResolvedValue(mockGearItem as never)

    const { POST } = await import('@/app/api/gear/[id]/research/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/research', 'POST')
    const res = await POST(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(200)

    expect(generateGearResearch).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(generateGearResearch).mock.calls[0][0]
    expect(callArgs.name).toBe('Camp Stove')
    expect(callArgs.brand).toBe('MSR')
    expect(callArgs.category).toBe('cooking')

    const body = await res.json()
    expect(body.id).toBe('research-1')
    expect(body.researchedAt).toBe('2026-04-01T10:00:00.000Z')
    expect(body.verdict).toBe('Worth upgrading')
  })
})

describe('GET /api/gear/[id]/research', () => {
  it('Test 3: returns stored result when GearResearch row exists', async () => {
    vi.mocked(prisma.gearResearch.findUnique).mockResolvedValue(mockSavedResearch as never)

    const { GET } = await import('@/app/api/gear/[id]/research/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/research', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.verdict).toBe('Worth upgrading')
    expect(body.id).toBe('research-1')
    expect(body.researchedAt).toBe('2026-04-01T10:00:00.000Z')
  })

  it('Test 4: returns 404 when no research exists for gear item', async () => {
    vi.mocked(prisma.gearResearch.findUnique).mockResolvedValue(null)

    const { GET } = await import('@/app/api/gear/[id]/research/route')
    const req = makeRequest('http://localhost/api/gear/gear-1/research', 'GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'gear-1' }) })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('No research found')
  })
})
