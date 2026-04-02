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
    it.todo('accepts optional voiceTranscript field')
  })
})
