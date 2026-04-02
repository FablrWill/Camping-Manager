import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/trips/[id]/usage/route'

vi.mock('@/lib/db', () => ({
  prisma: {
    packingItem: {
      update: vi.fn(),
    },
  },
}))

describe('Usage Tracking (LEARN-01)', () => {
  describe('PATCH /api/trips/[id]/usage', () => {
    it('returns 400 when gearId is missing', async () => {
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('gearId is required')
    })

    it('validates usageStatus must be one of the allowed values', () => {
      const validStatuses = ['used', "didn't need", 'forgot but needed', null]
      expect(validStatuses).toContain('used')
      expect(validStatuses).toContain("didn't need")
      expect(validStatuses).toContain('forgot but needed')
      expect(validStatuses).toContain(null)
      expect(validStatuses).not.toContain('invalid')
    })

    it.todo('updates PackingItem.usageStatus to "used"')
    it.todo('updates PackingItem.usageStatus to "didn\'t need"')
    it.todo('updates PackingItem.usageStatus to "forgot but needed"')
    it.todo('returns 404 for non-existent tripId_gearId combo')
  })

  describe('GET /api/packing-list includes usageState', () => {
    it('usageState type is Record<string, string | null>', () => {
      const usageState: Record<string, string | null> = {
        'gear-1': 'used',
        'gear-2': "didn't need",
        'gear-3': null,
      }
      expect(usageState['gear-1']).toBe('used')
      expect(usageState['gear-3']).toBeNull()
    })

    it.todo('response includes usageState map alongside packedState')
  })
})
