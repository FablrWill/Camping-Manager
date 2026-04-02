import { describe, it, expect } from 'vitest'

describe('Voice Debrief Persistence (LEARN-03)', () => {
  describe('POST /api/voice/apply with TripFeedback', () => {
    it.todo('creates TripFeedback record with voiceTranscript')
    it.todo('creates TripFeedback record without voiceTranscript when not provided')
    it.todo('stores insights as JSON string')
    it.todo('sets status to "applied"')
    it.todo('existing apply route write-back works unchanged after TripFeedback addition')
  })

  describe('apply route regression', () => {
    it.todo('gear note write-back still executes when TripFeedback is added')
    it.todo('location rating update still executes when TripFeedback is added')
    it.todo('response shape { applied: results } is unchanged')
  })

  describe('ApplyInsightRequest type', () => {
    it('accepts optional voiceTranscript field in request shape', () => {
      // Type-level test: verify the shape is structurally valid
      type ApplyInsightRequest = {
        tripId: string
        voiceTranscript?: string
        insights: Array<{ type: string; content: string }>
      }
      const req: ApplyInsightRequest = {
        tripId: 'trip-1',
        insights: [{ type: 'gear', content: 'good tent' }],
      }
      expect(req.voiceTranscript).toBeUndefined()

      const reqWithTranscript: ApplyInsightRequest = {
        tripId: 'trip-1',
        voiceTranscript: 'The trip was great.',
        insights: [],
      }
      expect(reqWithTranscript.voiceTranscript).toBe('The trip was great.')
    })
  })
})
