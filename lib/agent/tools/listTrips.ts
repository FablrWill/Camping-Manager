import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const listTripsTool: Tool = {
  name: 'list_trips',
  description: 'List camping trips. Set upcoming=true for future trips only.',
  input_schema: {
    type: 'object',
    properties: {
      upcoming: {
        type: 'boolean',
        description: 'If true, return only trips with startDate >= today',
      },
    },
    required: [],
  },
};

export async function executeListTrips(input: { upcoming?: boolean }): Promise<string> {
  try {
    const where = input.upcoming ? { startDate: { gte: new Date() } } : {};

    const trips = await prisma.trip.findMany({
      where,
      include: {
        location: { select: { name: true } },
        vehicle: { select: { name: true } },
        _count: { select: { packingItems: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const mapped = trips.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      location: t.location?.name ?? null,
      vehicle: t.vehicle?.name ?? null,
      packingItemCount: t._count.packingItems,
      notes: t.notes,
    }));

    return JSON.stringify({ count: mapped.length, trips: mapped });
  } catch (error) {
    return `Error: Failed to list trips — ${(error as Error).message}`;
  }
}
