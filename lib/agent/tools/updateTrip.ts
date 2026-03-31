import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const updateTripTool: Tool = {
  name: 'update_trip',
  description: "Update an existing trip's details.",
  input_schema: {
    type: 'object',
    properties: {
      tripId: {
        type: 'string',
        description: 'The trip ID to update',
      },
      name: {
        type: 'string',
        description: 'Updated trip name',
      },
      startDate: {
        type: 'string',
        description: 'Updated start date (YYYY-MM-DD)',
      },
      endDate: {
        type: 'string',
        description: 'Updated end date (YYYY-MM-DD)',
      },
      notes: {
        type: 'string',
        description: 'Updated trip notes',
      },
      locationId: {
        type: 'string',
        description: 'Updated location ID',
      },
      vehicleId: {
        type: 'string',
        description: 'Updated vehicle ID',
      },
    },
    required: ['tripId'],
  },
};

export async function executeUpdateTrip(input: {
  tripId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  locationId?: string;
  vehicleId?: string;
}): Promise<string> {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) data.endDate = new Date(input.endDate);
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.locationId !== undefined) data.locationId = input.locationId;
    if (input.vehicleId !== undefined) data.vehicleId = input.vehicleId;

    const updated = await prisma.trip.update({
      where: { id: input.tripId },
      data,
      select: { name: true },
    });

    const changes = Object.keys(data).join(', ');
    return `Updated trip "${updated.name}": ${changes}`;
  } catch (error) {
    return `Error: Failed to update trip — ${(error as Error).message}`;
  }
}
