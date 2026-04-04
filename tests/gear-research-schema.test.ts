import { describe, it, expect } from 'vitest'
import { GearResearchResultSchema } from '@/lib/parse-claude'

const validResult = {
  verdict: 'Worth upgrading' as const,
  alternatives: [
    {
      name: 'MSR PocketRocket 2',
      brand: 'MSR',
      priceRange: '$45-55',
      pros: ['Lighter weight', 'More compact'],
      cons: ['No wind protection'],
      reason: 'Best-in-class ultralight stove',
    },
    {
      name: 'Jetboil Flash',
      brand: 'Jetboil',
      priceRange: '$100-120',
      pros: ['Faster boil', 'Integrated cup'],
      cons: ['Heavier', 'More expensive'],
      reason: 'Best for speed and convenience',
    },
    {
      name: 'Snow Peak LiteMax',
      brand: 'Snow Peak',
      priceRange: '$60-70',
      pros: ['Ultra-compact', 'Durable titanium'],
      cons: ['No simmer control'],
      reason: 'Premium ultralight option',
    },
  ],
  summary: 'Your current stove is functional but newer options offer significant weight savings.',
  priceDisclaimer: 'Prices are approximate and may be outdated.',
}

describe('GearResearchResultSchema', () => {
  it('validates a well-formed result with verdict and 3 alternatives', () => {
    const result = GearResearchResultSchema.safeParse(validResult)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.verdict).toBe('Worth upgrading')
      expect(result.data.alternatives).toHaveLength(3)
    }
  })

  it('rejects result missing verdict field', () => {
    const { verdict: _v, ...withoutVerdict } = validResult
    const result = GearResearchResultSchema.safeParse(withoutVerdict)
    expect(result.success).toBe(false)
  })

  it('rejects result with invalid verdict value "Maybe"', () => {
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      verdict: 'Maybe',
    })
    expect(result.success).toBe(false)
  })

  it('rejects result with more than 3 alternatives', () => {
    const fourAlts = [
      ...validResult.alternatives,
      {
        name: 'Extra Stove',
        brand: 'BrandX',
        priceRange: '$30-40',
        pros: ['Cheap'],
        cons: ['Heavy'],
        reason: 'Budget option',
      },
    ]
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      alternatives: fourAlts,
    })
    expect(result.success).toBe(false)
  })

  it('accepts result with 0 alternatives', () => {
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      alternatives: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts "Keep what you have" as a valid verdict', () => {
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      verdict: 'Keep what you have',
    })
    expect(result.success).toBe(true)
  })

  it('accepts "Only if budget allows" as a valid verdict', () => {
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      verdict: 'Only if budget allows',
    })
    expect(result.success).toBe(true)
  })

  it('accepts alternative without optional brand field', () => {
    const altWithoutBrand = validResult.alternatives.map(({ brand: _b, ...rest }) => rest)
    const result = GearResearchResultSchema.safeParse({
      ...validResult,
      alternatives: [altWithoutBrand[0]],
    })
    expect(result.success).toBe(true)
  })
})
