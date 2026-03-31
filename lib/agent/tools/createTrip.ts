import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const createTripTool: Tool = {
  name: 'create_trip',
  description: 'Create a new camping trip.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Trip name (e.g. "Pisgah Weekend")',
      },
      startDate: {
        type: 'string',
        description: 'Start date in ISO format (YYYY-MM-DD)',
      },
      endDate: {
        type: 'string',
        description: 'End date in ISO format (YYYY-MM-DD)',
      },
      locationId: {
        type: 'string',
        description: 'Optional: ID of a saved location',
      },
      vehicleId: {
        type: 'string',
        description: 'Optional: ID of the vehicle to use',
      },
      notes: {
        type: 'string',
        description: 'Optional trip notes',
      },
    },
    required: ['name', 'startDate', 'endDate'],
  },
};

export async function executeCreateTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  locationId?: string;
  vehicleId?: string;
  notes?: string;
}): Promise<string> {
  try {
    const trip = await prisma.trip.create({
      data: {
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        locationId: input.locationId ?? null,
        vehicleId: input.vehicleId ?? null,
        notes: input.notes ?? null,
      },
    });

    return `Created trip: ${trip.name} (${input.startDate} to ${input.endDate}), ID: ${trip.id}`;
  } catch (error) {
    return `Error: Failed to create trip — ${(error as Error).message}`;
  }
}
