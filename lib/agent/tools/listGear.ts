import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { CATEGORIES } from '@/lib/gear-categories';

export const listGearTool: Tool = {
  name: 'list_gear',
  description: 'List gear inventory, optionally filtered by category or wishlist status.',
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: `Filter by category: ${CATEGORIES.map((c) => c.value).join(', ')}`,
      },
      isWishlist: {
        type: 'boolean',
        description: 'If true, return wishlist items only. If false, return owned items only. Omit for all items.',
      },
    },
    required: [],
  },
};

export async function executeListGear(input: { category?: string; isWishlist?: boolean }): Promise<string> {
  try {
    const where: Record<string, unknown> = {};
    if (input.category) where.category = input.category;
    if (input.isWishlist !== undefined) where.isWishlist = input.isWishlist;

    const items = await prisma.gearItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        condition: true,
        weight: true,
        notes: true,
        isWishlist: true,
      },
      orderBy: { name: 'asc' },
    });

    return JSON.stringify({ count: items.length, items });
  } catch (error) {
    return `Error: Failed to list gear — ${(error as Error).message}`;
  }
}
