import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const getTripTool: Tool = {
  name: 'get_trip',
  description: 'Get full details of a specific trip including packing list.',
  input_schema: {
    type: 'object',
    properties: {
      tripId: {
        type: 'string',
        description: 'The trip ID to fetch',
      },
    },
    required: ['tripId'],
  },
};

export async function executeGetTrip(input: { tripId: string }): Promise<string> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: input.tripId },
      include: {
        location: { select: { id: true, name: true, type: true, rating: true } },
        vehicle: { select: { id: true, name: true } },
        packingItems: {
          include: {
            gear: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });

    if (!trip) {
      return `Trip not found: ${input.tripId}`;
    }

    return JSON.stringify({
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      location: trip.location,
      vehicle: trip.vehicle,
      notes: trip.notes,
      packingItems: trip.packingItems.map((p) => ({
        gearId: p.gearId,
        gearName: p.gear.name,
        gearCategory: p.gear.category,
        packed: p.packed,
        notes: p.notes,
      })),
    });
  } catch (error) {
    return `Error: Failed to get trip — ${(error as Error).message}`;
  }
}
