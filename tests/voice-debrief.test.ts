import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApplyInsightRequest } from '@/lib/voice/types'

// ---------------------------------------------------------------------------
// Mock prisma before any route import
// ---------------------------------------------------------------------------
const mockTripUpdate = vi.fn()
const mockGearFindUnique = vi.fn()
const mockGearUpdate = vi.fn()
const mockLocationUpdate = vi.fn()
const mockTripFeedbackCreate = vi.fn()
const mockTripFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: {
      findUnique: mockTripFindUnique,
      update: mockTripUpdate,
    },
    gearItem: {
      findUnique: mockGearFindUnique,
      update: mockGearUpdate,
    },
    location: {
      update: mockLocationUpdate,
    },
    tripFeedback: {
      create: mockTripFeedbackCreate,
    },
  },
}))

// ---------------------------------------------------------------------------
// Helper: build a minimal NextRequest-like object
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/voice/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Voice Debrief Persistence (LEARN-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: fire-and-forget resolves OK
    mockTripFeedbackCreate.mockResolvedValue({ id: 'fb-1' })
    // Default: trip and gear exist
    mockTripFindUnique.mockResolvedValue({ id: 'trip-1', notes: '' })
    mockTripUpdate.mockResolvedValue({ id: 'trip-1' })
    mockGearFindUnique.mockResolvedValue({ id: 'gear-1', name: 'Tent', notes: '' })
    mockGearUpdate.mockResolvedValue({ id: 'gear-1' })
    mockLocationUpdate.mockResolvedValue({ id: 'loc-1' })
  })

  // ---------------------------------------------------------------------------
  // ApplyInsightRequest type tests
  // ---------------------------------------------------------------------------
  describe('ApplyInsightRequest type', () => {
    it('accepts optional voiceTranscript field — absent', () => {
      const req: ApplyInsightRequest = {
        tripId: 'trip-1',
        insights: {
          whatWorked: [],
          whatDidnt: [],
          gearUpdates: [],
          locationRating: null,
        },
      }
      expect(req.voiceTranscript).toBeUndefined()
    })

    it('accepts optional voiceTranscript field — present', () => {
      const req: ApplyInsightRequest = {
        tripId: 'trip-1',
        voiceTranscript: 'The trip was great.',
        insights: {
          whatWorked: ['Good sleep'],
          whatDidnt: [],
          gearUpdates: [],
          locationRating: null,
        },
      }
      expect(req.voiceTranscript).toBe('The trip was great.')
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/voice/apply — TripFeedback persistence
  // ---------------------------------------------------------------------------
  describe('POST /api/voice/apply with TripFeedback', () => {
    it('creates TripFeedback record with voiceTranscript when provided', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        voiceTranscript: 'Great camping spot.',
        insights: {
          whatWorked: [],
          whatDidnt: [],
          gearUpdates: [],
          locationRating: null,
        },
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      // Wait for fire-and-forget to settle
      await vi.runAllTimersAsync().catch(() => {})
      await Promise.resolve()

      expect(mockTripFeedbackCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tripId: 'trip-1',
            voiceTranscript: 'Great camping spot.',
            status: 'applied',
          }),
        })
      )
    })

    it('creates TripFeedback record without voiceTranscript when not provided', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        insights: {
          whatWorked: [],
          whatDidnt: [],
          gearUpdates: [],
          locationRating: null,
        },
      })

      await POST(req as never)
      await Promise.resolve()

      expect(mockTripFeedbackCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tripId: 'trip-1',
            voiceTranscript: null,
            status: 'applied',
          }),
        })
      )
    })

    it('stores insights as JSON string', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const insights = {
        whatWorked: ['Good sleep'],
        whatDidnt: ['Too cold'],
        gearUpdates: [],
        locationRating: null,
      }

      const req = makeRequest({ tripId: 'trip-1', insights })
      await POST(req as never)
      await Promise.resolve()

      expect(mockTripFeedbackCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insights: JSON.stringify(insights),
          }),
        })
      )
    })

    it('sets status to "applied"', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        insights: { whatWorked: [], whatDidnt: [], gearUpdates: [], locationRating: null },
      })

      await POST(req as never)
      await Promise.resolve()

      expect(mockTripFeedbackCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'applied' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // apply route regression tests
  // ---------------------------------------------------------------------------
  describe('apply route regression', () => {
    it('gear note write-back still executes after TripFeedback addition', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        voiceTranscript: 'Some transcript.',
        insights: {
          whatWorked: [],
          whatDidnt: [],
          gearUpdates: [{ gearId: 'gear-1', text: 'Held up well in rain' }],
          locationRating: null,
        },
      })

      const res = await POST(req as never)
      const body = await res.json()

      expect(mockGearUpdate).toHaveBeenCalledOnce()
      expect(body.applied).toContain('Gear "Tent" notes updated')
    })

    it('location rating update still executes after TripFeedback addition', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        insights: {
          whatWorked: [],
          whatDidnt: [],
          gearUpdates: [],
          locationRating: { locationId: 'loc-1', rating: 4 },
        },
      })

      const res = await POST(req as never)
      const body = await res.json()

      expect(mockLocationUpdate).toHaveBeenCalledOnce()
      expect(body.applied).toContain('Location rating updated')
    })

    it('response shape { applied: results } is unchanged', async () => {
      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        insights: { whatWorked: [], whatDidnt: [], gearUpdates: [], locationRating: null },
      })

      const res = await POST(req as never)
      const body = await res.json()

      expect(body).toHaveProperty('applied')
      expect(Array.isArray(body.applied)).toBe(true)
      expect(body).not.toHaveProperty('error')
    })

    it('TripFeedback creation failure does not block response', async () => {
      mockTripFeedbackCreate.mockRejectedValue(new Error('DB write failed'))

      const { POST } = await import('@/app/api/voice/apply/route')

      const req = makeRequest({
        tripId: 'trip-1',
        insights: { whatWorked: [], whatDidnt: [], gearUpdates: [], locationRating: null },
      })

      const res = await POST(req as never)
      // Response must still succeed even if TripFeedback creation fails
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('applied')
    })
  })
})
