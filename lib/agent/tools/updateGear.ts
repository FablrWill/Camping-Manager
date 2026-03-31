import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const updateGearTool: Tool = {
  name: 'update_gear',
  description: "Update a gear item's notes, condition, or storage location.",
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The gear item ID to update',
      },
      notes: {
        type: 'string',
        description: 'Updated notes for the gear item',
      },
      condition: {
        type: 'string',
        description: 'Updated condition: new, good, fair, worn, broken',
      },
      storageLocation: {
        type: 'string',
        description: 'Where the item is stored (e.g. "garage shelf", "car bin 2")',
      },
    },
    required: ['id'],
  },
};

export async function executeUpdateGear(input: {
  id: string;
  notes?: string;
  condition?: string;
  storageLocation?: string;
}): Promise<string> {
  try {
    const data: Record<string, unknown> = {};
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.condition !== undefined) data.condition = input.condition;
    if (input.storageLocation !== undefined) data.storageLocation = input.storageLocation;

    const updated = await prisma.gearItem.update({
      where: { id: input.id },
      data,
      select: { name: true },
    });

    const changes = Object.keys(data).join(', ');
    return `Updated ${updated.name}: ${changes}`;
  } catch (error) {
    return `Error: Failed to update gear — ${(error as Error).message}`;
  }
}
