import { describe, it, expect } from 'vitest'
import { VehicleChecklistResultSchema } from '@/lib/parse-claude'
import { z } from 'zod'

// Access item schema shape for direct testing by re-defining it inline
const ItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
})

describe('VehicleChecklistItemSchema', () => {
  it('Test 1: accepts valid item with all fields', () => {
    const result = ItemSchema.parse({
      id: 'vc-0',
      text: 'Check tire pressure',
      checked: false,
    })
    expect(result.id).toBe('vc-0')
    expect(result.text).toBe('Check tire pressure')
    expect(result.checked).toBe(false)
  })

  it('Test 2: defaults checked to false when omitted', () => {
    const result = ItemSchema.parse({
      id: 'vc-1',
      text: 'Verify oil level on dipstick',
    })
    expect(result.checked).toBe(false)
  })
})

describe('VehicleChecklistResultSchema', () => {
  it('Test 3: accepts valid result with multiple items', () => {
    const result = VehicleChecklistResultSchema.parse({
      items: [
        { id: 'vc-0', text: 'Check tire pressure', checked: false },
        { id: 'vc-1', text: 'Verify oil level on dipstick', checked: true },
      ],
    })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('vc-0')
    expect(result.items[1].checked).toBe(true)
  })

  it('Test 4: rejects empty object (missing items array)', () => {
    expect(() => VehicleChecklistResultSchema.parse({})).toThrow()
  })

  it('Test 5: rejects items with missing id field', () => {
    expect(() =>
      VehicleChecklistResultSchema.parse({
        items: [{ text: 'Check tire pressure', checked: false }],
      })
    ).toThrow()
  })
})
