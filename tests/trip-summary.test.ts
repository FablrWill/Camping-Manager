import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { TripSummaryResultSchema } from '@/lib/parse-claude'
import { POST } from '@/app/api/trips/[id]/feedback/route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    tripFeedback: { findFirst: vi.fn(), create: vi.fn() },
    trip: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/claude', () => ({
  generateTripSummary: vi.fn(),
}))

const mockFindFirst = vi.mocked(prisma.tripFeedback.findFirst)
const mockTripFindUnique = vi.mocked(prisma.trip.findUnique)

describe('Trip Summary (LEARN-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('TripSummaryResultSchema', () => {
    it('validates valid summary result', () => {
      const input = {
        whatToDrop: ['Camping chair', 'Extra tarp'],
        whatWasMissing: ['Rain jacket'],
        locationRating: 4,
        summary: 'Great trip overall. Weather was ideal and campfire setup worked well.',
      }
      const result = TripSummaryResultSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.whatToDrop).toEqual(['Camping chair', 'Extra tarp'])
        expect(result.data.locationRating).toBe(4)
      }
    })

    it('rejects missing summary field', () => {
      const input = {
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: null,
        // summary is intentionally missing
      }
      const result = TripSummaryResultSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('defaults whatToDrop and whatWasMissing to empty arrays', () => {
      const input = {
        locationRating: null,
        summary: 'Good trip.',
        // whatToDrop and whatWasMissing intentionally missing — should default to []
      }
      const result = TripSummaryResultSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.whatToDrop).toEqual([])
        expect(result.data.whatWasMissing).toEqual([])
      }
    })

    it('validates locationRating is 1-5 or null', () => {
      const validNull = TripSummaryResultSchema.safeParse({
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: null,
        summary: 'Fine.',
      })
      expect(validNull.success).toBe(true)

      const validMin = TripSummaryResultSchema.safeParse({
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: 1,
        summary: 'Poor spot.',
      })
      expect(validMin.success).toBe(true)

      const validMax = TripSummaryResultSchema.safeParse({
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: 5,
        summary: 'Perfect.',
      })
      expect(validMax.success).toBe(true)

      const tooHigh = TripSummaryResultSchema.safeParse({
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: 6,
        summary: 'Off scale.',
      })
      expect(tooHigh.success).toBe(false)

      const tooLow = TripSummaryResultSchema.safeParse({
        whatToDrop: [],
        whatWasMissing: [],
        locationRating: 0,
        summary: 'Off scale.',
      })
      expect(tooLow.success).toBe(false)
    })
  })

  describe('POST /api/trips/[id]/feedback', () => {
    it('returns existing summary if one exists (no duplicate generation)', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const existingFeedback = { id: 'fb-1', tripId: 'trip-1', summary: '{"summary":"test"}', status: 'generated', createdAt: new Date() }
      mockFindFirst.mockResolvedValue(existingFeedback as any)

      const req = new NextRequest('http://localhost/api/trips/trip-1/feedback', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.cached).toBe(true)
      expect(json.feedback.id).toBe('fb-1')
    })

    it('returns 400 if not all packing items have usageStatus', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockFindFirst.mockResolvedValue(null)
      mockTripFindUnique.mockResolvedValue({
        id: 'trip-1',
        name: 'Test Trip',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-03'),
        location: null,
        packingItems: [
          { id: 'pi-1', gearId: 'g-1', usageStatus: 'used', gear: { name: 'Tent', category: 'shelter' } },
          { id: 'pi-2', gearId: 'g-2', usageStatus: null, gear: { name: 'Stove', category: 'cooking' } },
        ],
      } as any)

      const req = new NextRequest('http://localhost/api/trips/trip-1/feedback', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'trip-1' }) })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toContain('Not all packing items have been reviewed')
    })
  })

  describe('auto-generate trigger', () => {
    it('detects completion when all items have non-null usageStatus', () => {
      const usageMap: Record<string, string | null> = {
        'gear-1': 'used',
        'gear-2': "didn't need",
        'gear-3': 'forgot but needed',
      }
      const allComplete = Object.values(usageMap).every(s => s !== null)
      expect(allComplete).toBe(true)
    })

    it('does not trigger when some items still null', () => {
      const usageMap: Record<string, string | null> = {
        'gear-1': 'used',
        'gear-2': null,
      }
      const allComplete = Object.values(usageMap).every(s => s !== null)
      expect(allComplete).toBe(false)
    })

    it('allComplete is true only when every item has non-null usageStatus', () => {
      const allNull: Record<string, string | null> = { 'gear-1': null }
      const allFilled: Record<string, string | null> = { 'gear-1': 'used', 'gear-2': "didn't need" }
      const partial: Record<string, string | null> = { 'gear-1': 'used', 'gear-2': null }

      expect(Object.values(allNull).every(s => s !== null)).toBe(false)
      expect(Object.values(allFilled).every(s => s !== null)).toBe(true)
      expect(Object.values(partial).every(s => s !== null)).toBe(false)
    })
  })
})
