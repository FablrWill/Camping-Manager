import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const tripsTool: Tool = {
  name: 'query_trips',
  description: "Get the user's trips. Can fetch upcoming, past, or all trips. Returns trip details including location, dates, and packing status.",
  input_schema: {
    type: 'object',
    properties: {
      filter: { type: 'string', enum: ['upcoming', 'past', 'all'], description: 'Which trips to return' },
      limit: { type: 'number', description: 'Max number of trips to return (default 5)' },
    },
    required: [],
  },
};

export async function executeTripsTool(input: { filter?: string; limit?: number }) {
  const now = new Date();
  const limit = input.limit ?? 5;

  const where =
    input.filter === 'upcoming'
      ? { endDate: { gte: now } }
      : input.filter === 'past'
        ? { endDate: { lt: now } }
        : {};

  const trips = await prisma.trip.findMany({
    where,
    include: {
      location: { select: { id: true, name: true } },
      vehicle: { select: { id: true, name: true } },
      _count: { select: { packingItems: true, photos: true } },
    },
    orderBy: { startDate: input.filter === 'past' ? 'desc' : 'asc' },
    take: limit,
  });

  return {
    count: trips.length,
    trips: trips.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      location: t.location?.name ?? null,
      vehicle: t.vehicle?.name ?? null,
      packingItemCount: t._count.packingItems,
      photoCount: t._count.photos,
      notes: t.notes,
    })),
  };
}
