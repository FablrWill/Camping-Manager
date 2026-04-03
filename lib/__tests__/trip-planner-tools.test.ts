// @vitest-environment node
import { describe, it, expect } from 'vitest'

// These imports will fail until Plan 33-01 creates the files.
// Using require() so this file compiles even before the source files exist.
// When the source module is missing, require() throws at runtime — Vitest
// reports each test as a failure, which is the RED phase we want.
//
// import { TRIP_PLANNER_TOOLS, executeTripPlannerTool } from '../agent/tools/trip-planner-tools'

describe('TRIP_PLANNER_TOOLS', () => {
  it('contains exactly 4 tools', () => {
    // RED: Will pass after Plan 33-01 Task 1 creates trip-planner-tools.ts
    const { TRIP_PLANNER_TOOLS } = require('../agent/tools/trip-planner-tools')
    expect(TRIP_PLANNER_TOOLS).toHaveLength(4)
  })

  it('includes list_gear, get_weather, list_locations, web_search_campsites', () => {
    const { TRIP_PLANNER_TOOLS } = require('../agent/tools/trip-planner-tools')
    const names = TRIP_PLANNER_TOOLS.map((t: { name: string }) => t.name)
    expect(names).toContain('list_gear')
    expect(names).toContain('get_weather')
    expect(names).toContain('list_locations')
    expect(names).toContain('web_search_campsites')
  })
})

describe('executeTripPlannerTool', () => {
  it('returns error string for unknown tool', async () => {
    const { executeTripPlannerTool } = require('../agent/tools/trip-planner-tools')
    const result = await executeTripPlannerTool('unknown_tool', {})
    expect(result).toContain('Error')
    expect(result).toContain('unknown_tool')
  })
})
