import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const listLocationsTool: Tool = {
  name: 'list_locations',
  description: 'List saved camping spots. Filter by type or minimum rating.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Location type: dispersed, campground, overlook, water_access',
      },
      minRating: {
        type: 'number',
        description: 'Minimum star rating (1-5)',
      },
    },
    required: [],
  },
};

export async function executeListLocations(input: { type?: string; minRating?: number }): Promise<string> {
  try {
    const where: Record<string, unknown> = {};
    if (input.type) where.type = input.type;
    if (input.minRating !== undefined) where.rating = { gte: input.minRating };

    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        rating: true,
        cellSignal: true,
        notes: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { rating: 'desc' },
    });

    return JSON.stringify({ count: locations.length, locations });
  } catch (error) {
    return `Error: Failed to list locations — ${(error as Error).message}`;
  }
}
