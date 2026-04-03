import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { CATEGORIES } from '@/lib/gear-categories';

export const gearTool: Tool = {
  name: 'query_gear',
  description: "Search the user's gear inventory. Can filter by category, condition, or wishlist status. Use this to check what gear the user owns before making packing recommendations.",
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: `Filter by category: ${CATEGORIES.map((c) => c.value).join(', ')}` },
      isWishlist: { type: 'boolean', description: 'If true, return wishlist items only. If false, return owned items only. Omit for all items.' },
      condition: { type: 'string', description: 'Filter by condition: new, good, fair, worn, broken' },
    },
    required: [],
  },
};

export async function executeGearTool(input: { category?: string; isWishlist?: boolean; condition?: string }) {
  const where: Record<string, unknown> = {};
  if (input.category) where.category = input.category;
  if (input.isWishlist !== undefined) where.isWishlist = input.isWishlist;
  if (input.condition) where.condition = input.condition;

  const items = await prisma.gearItem.findMany({
    where,
    select: { id: true, name: true, brand: true, category: true, condition: true, weight: true, notes: true, isWishlist: true, wattage: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return {
    count: items.length,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      category: i.category,
      condition: i.condition,
      weight: i.weight,
      wattage: i.wattage,
      isWishlist: i.isWishlist,
      notes: i.notes,
    })),
  };
}
