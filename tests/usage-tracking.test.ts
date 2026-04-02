import { describe, it, expect } from 'vitest'

describe('Usage Tracking (LEARN-01)', () => {
  describe('PATCH /api/trips/[id]/usage', () => {
    it.todo('returns 400 when gearId is missing')
    it.todo('updates PackingItem.usageStatus to "used"')
    it.todo('updates PackingItem.usageStatus to "didn\'t need"')
    it.todo('updates PackingItem.usageStatus to "forgot but needed"')
    it.todo('returns 404 for non-existent tripId_gearId combo')
  })

  describe('GET /api/packing-list includes usageState', () => {
    it.todo('response includes usageState map alongside packedState')
  })
})
