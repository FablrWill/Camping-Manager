// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { TRIP_PLANNER_TOOLS, executeTripPlannerTool } from '../agent/tools/trip-planner-tools'

// Mock prisma to avoid DB connections in unit tests
vi.mock('@/lib/db', () => ({
  prisma: {
    gearItem: { findMany: vi.fn().mockResolvedValue([]) },
    location: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

describe('TRIP_PLANNER_TOOLS', () => {
  it('contains exactly 4 tools', () => {
    expect(TRIP_PLANNER_TOOLS).toHaveLength(4)
  })

  it('includes list_gear, get_weather, list_locations, web_search_campsites', () => {
    const names = TRIP_PLANNER_TOOLS.map((t) => t.name)
    expect(names).toContain('list_gear')
    expect(names).toContain('get_weather')
    expect(names).toContain('list_locations')
    expect(names).toContain('web_search_campsites')
  })
})

describe('executeTripPlannerTool', () => {
  it('returns error string for unknown tool', async () => {
    const result = await executeTripPlannerTool('unknown_tool', {})
    expect(result).toContain('Error')
    expect(result).toContain('unknown_tool')
  })
})
