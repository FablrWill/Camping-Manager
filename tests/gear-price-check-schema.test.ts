import { describe, it, expect } from 'vitest'
import { GearPriceCheckResultSchema } from '@/lib/parse-claude'

function isDeal(
  foundPriceLow: number,
  targetPrice: number | null
): boolean {
  return targetPrice != null ? foundPriceLow <= targetPrice : false;
}

describe('GearPriceCheckResultSchema', () => {
  it('Test 1: parse succeeds for valid input', () => {
    const input = {
      foundPriceRange: '$89-109',
      foundPriceLow: 89.0,
      retailers: ['REI'],
      disclaimer: 'Prices based on training data.',
    };
    const result = GearPriceCheckResultSchema.parse(input);
    expect(result.foundPriceRange).toBe('$89-109');
    expect(result.foundPriceLow).toBe(89.0);
    expect(result.retailers).toEqual(['REI']);
    expect(result.disclaimer).toBe('Prices based on training data.');
  });

  it('Test 2: parse fails for missing foundPriceRange', () => {
    expect(() =>
      GearPriceCheckResultSchema.parse({
        foundPriceLow: 89.0,
        retailers: ['REI'],
        disclaimer: 'note',
      })
    ).toThrow();
  });

  it('Test 3: parse fails for missing foundPriceLow', () => {
    expect(() =>
      GearPriceCheckResultSchema.parse({
        foundPriceRange: '$89-109',
        retailers: ['REI'],
        disclaimer: 'note',
      })
    ).toThrow();
  });

  it('Test 4: parse coerces string "89" to number 89 for foundPriceLow', () => {
    const result = GearPriceCheckResultSchema.parse({
      foundPriceRange: '$89-109',
      foundPriceLow: '89',
      retailers: [],
      disclaimer: 'note',
    });
    expect(result.foundPriceLow).toBe(89);
  });

  it('Test 5: parse accepts empty retailers array', () => {
    const result = GearPriceCheckResultSchema.parse({
      foundPriceRange: '$89-109',
      foundPriceLow: 89.0,
      retailers: [],
      disclaimer: 'note',
    });
    expect(result.retailers).toEqual([]);
  });

  it('Test 6: isDeal returns true when foundPriceLow (89) <= targetPrice (100)', () => {
    expect(isDeal(89, 100)).toBe(true);
  });

  it('Test 7: isDeal returns false when foundPriceLow (89) > targetPrice (50)', () => {
    expect(isDeal(89, 50)).toBe(false);
  });

  it('Test 8: isDeal returns false when targetPrice is null', () => {
    expect(isDeal(89, null)).toBe(false);
  });
});
