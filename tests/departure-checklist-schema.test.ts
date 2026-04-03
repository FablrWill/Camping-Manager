import { describe, it, expect } from 'vitest'
import { DepartureChecklistResultSchema } from '@/lib/parse-claude'

// Access private schema via the exported result schema's shape
// We re-import DepartureChecklistItemSchema indirectly through result schema
import { z } from 'zod'

// Inline the item schema shape for direct testing
const ItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(),
})

describe('DepartureChecklistItemSchema', () => {
  it('accepts suggestedTime as a string', () => {
    const result = ItemSchema.parse({
      id: 'chk-0-0',
      text: 'Pack bags',
      checked: false,
      isUnpackedWarning: false,
      suggestedTime: '9:00 PM Thu',
    })
    expect(result.suggestedTime).toBe('9:00 PM Thu')
  })

  it('accepts suggestedTime as null', () => {
    const result = ItemSchema.parse({
      id: 'chk-0-0',
      text: 'Pack bags',
      checked: false,
      isUnpackedWarning: false,
      suggestedTime: null,
    })
    expect(result.suggestedTime).toBeNull()
  })

  it('accepts absent suggestedTime for backwards compatibility', () => {
    const result = ItemSchema.parse({
      id: 'chk-0-0',
      text: 'Pack bags',
      checked: false,
      isUnpackedWarning: false,
    })
    expect(result.suggestedTime).toBeUndefined()
  })
})

describe('DepartureChecklistResultSchema', () => {
  it('parses slots with mixed items (some with suggestedTime, some without)', () => {
    const result = DepartureChecklistResultSchema.parse({
      slots: [
        {
          label: 'Night Before',
          items: [
            {
              id: 'chk-0-0',
              text: 'Pack bags',
              checked: false,
              isUnpackedWarning: false,
              suggestedTime: '9:00 PM Thu',
            },
            {
              id: 'chk-0-1',
              text: 'Check weather',
              checked: false,
              isUnpackedWarning: false,
            },
          ],
        },
        {
          label: 'Morning',
          items: [
            {
              id: 'chk-1-0',
              text: 'Load vehicle',
              checked: false,
              isUnpackedWarning: false,
              suggestedTime: null,
            },
          ],
        },
      ],
    })
    expect(result.slots).toHaveLength(2)
    expect(result.slots[0].items[0].suggestedTime).toBe('9:00 PM Thu')
    expect(result.slots[0].items[1].suggestedTime).toBeUndefined()
    expect(result.slots[1].items[0].suggestedTime).toBeNull()
  })
})
