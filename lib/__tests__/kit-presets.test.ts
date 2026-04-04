import { describe, it, expect } from 'vitest'
import {
  extractGearIdsFromPackingList,
  computeGearIdsToRemove,
  buildReviewPrompt,
} from '@/lib/kit-utils'
import type { PackingListResult } from '@/lib/claude'

// ─── extractGearIdsFromPackingList ────────────────────────────────────────────

describe('extractGearIdsFromPackingList', () => {
  it('returns gearIds for fromInventory items that have a gearId', () => {
    const packingList: PackingListResult = {
      categories: [
        {
          name: 'Shelter',
          emoji: '⛺',
          items: [
            { name: 'Tent', fromInventory: true, gearId: 'gear-1' },
            { name: 'Sleeping Bag', fromInventory: true, gearId: 'gear-2' },
            { name: 'Sleeping Pad', fromInventory: true, gearId: 'gear-3' },
            { name: 'Firewood', fromInventory: false },
            { name: 'Ice', fromInventory: false },
          ],
        },
      ],
      tips: [],
    }
    const result = extractGearIdsFromPackingList(packingList)
    expect(result).toEqual(['gear-1', 'gear-2', 'gear-3'])
    expect(result).toHaveLength(3)
  })

  it('excludes fromInventory=true items where gearId is undefined', () => {
    const packingList: PackingListResult = {
      categories: [
        {
          name: 'Gear',
          emoji: '🎒',
          items: [
            { name: 'Known Item', fromInventory: true, gearId: 'gear-1' },
            { name: 'Unknown Item', fromInventory: true },
          ],
        },
      ],
      tips: [],
    }
    const result = extractGearIdsFromPackingList(packingList)
    expect(result).toEqual(['gear-1'])
    expect(result).toHaveLength(1)
  })

  it('returns empty array when categories is empty', () => {
    const packingList: PackingListResult = {
      categories: [],
      tips: [],
    }
    const result = extractGearIdsFromPackingList(packingList)
    expect(result).toEqual([])
  })
})

// ─── computeGearIdsToRemove ───────────────────────────────────────────────────

describe('computeGearIdsToRemove', () => {
  it('returns IDs from the kit that are NOT in any remaining kits', () => {
    const kitGearIds = ['g1', 'g2']
    const remainingKitsGearIds = [['g2', 'g3']]
    const result = computeGearIdsToRemove(kitGearIds, remainingKitsGearIds)
    expect(result).toEqual(['g1'])
  })

  it('returns empty array when all kit IDs are shared with remaining kits', () => {
    const kitGearIds = ['g1', 'g2']
    const remainingKitsGearIds = [['g1', 'g2', 'g3']]
    const result = computeGearIdsToRemove(kitGearIds, remainingKitsGearIds)
    expect(result).toEqual([])
  })

  it('returns all kit gearIds when no remaining kits exist', () => {
    const kitGearIds = ['g1', 'g2', 'g3']
    const remainingKitsGearIds: string[][] = []
    const result = computeGearIdsToRemove(kitGearIds, remainingKitsGearIds)
    expect(result).toEqual(['g1', 'g2', 'g3'])
  })
})

// ─── buildReviewPrompt ────────────────────────────────────────────────────────

describe('buildReviewPrompt', () => {
  const baseCtx = {
    appliedKits: [
      { name: 'Weekend Warrior', gearNames: ['Tent', 'Sleeping Bag', 'Stove'] },
      { name: 'Dog Trip', gearNames: ['Dog Bowl', 'Leash', 'Dog Food'] },
    ],
    tripName: 'Blue Ridge Camping',
    nights: 2,
    locationName: 'Pisgah National Forest',
    locationType: 'forest',
    weatherSummary: 'Cool and partly cloudy',
    bringingDog: false,
  }

  it('includes kit names and gear names in the prompt', () => {
    const prompt = buildReviewPrompt(baseCtx)
    expect(prompt).toContain('Weekend Warrior')
    expect(prompt).toContain('Dog Trip')
    expect(prompt).toContain('Tent')
    expect(prompt).toContain('Sleeping Bag')
    expect(prompt).toContain('Dog Bowl')
  })

  it('does NOT contain raw cuid-style ID strings', () => {
    const ctxWithIds = {
      ...baseCtx,
      appliedKits: [
        { name: 'Weekend Warrior', gearNames: ['Tent'] },
      ],
    }
    const prompt = buildReviewPrompt(ctxWithIds)
    // cuid patterns: cl[a-z0-9]{24} or similar
    expect(prompt).not.toMatch(/cl[a-z0-9]{20,}/)
    expect(prompt).not.toMatch(/[a-z0-9]{25,}/)
  })

  it('ends with instruction for bullet-point gaps', () => {
    const prompt = buildReviewPrompt(baseCtx)
    const lines = prompt.trim().split('\n')
    const lastLines = lines.slice(-5).join('\n')
    expect(lastLines).toContain('bullet')
  })
})
