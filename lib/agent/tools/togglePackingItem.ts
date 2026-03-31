import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const togglePackingItemTool: Tool = {
  name: 'toggle_packing_item',
  description: 'Mark a packing item as packed or unpacked for a trip.',
  input_schema: {
    type: 'object',
    properties: {
      tripId: {
        type: 'string',
        description: 'The trip ID',
      },
      gearId: {
        type: 'string',
        description: 'The gear item ID',
      },
      packed: {
        type: 'boolean',
        description: 'True to mark as packed, false to mark as unpacked',
      },
    },
    required: ['tripId', 'gearId', 'packed'],
  },
};

export async function executeTogglePackingItem(input: {
  tripId: string;
  gearId: string;
  packed: boolean;
}): Promise<string> {
  try {
    await prisma.packingItem.upsert({
      where: { tripId_gearId: { tripId: input.tripId, gearId: input.gearId } },
      update: { packed: input.packed },
      create: { tripId: input.tripId, gearId: input.gearId, packed: input.packed },
    });

    const status = input.packed ? 'packed' : 'unpacked';
    return `Marked gear item ${input.gearId} as ${status} for trip ${input.tripId}`;
  } catch (error) {
    return `Error: Failed to toggle packing item — ${(error as Error).message}`;
  }
}
