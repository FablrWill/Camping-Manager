import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const locationsTool: Tool = {
  name: 'query_locations',
  description: "Search the user's saved camping locations/spots. Filter by type, cell signal, rating, or water access. Use to find spots matching trip requirements.",
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Location type: dispersed, campground, overlook, water_access' },
      minRating: { type: 'number', description: 'Minimum star rating (1-5)' },
      waterAccess: { type: 'boolean', description: 'Filter to locations with water access' },
      cellSignal: { type: 'string', description: 'Cell signal level: none, weak, moderate, strong' },
    },
    required: [],
  },
};

export async function executeLocationsTool(input: { type?: string; minRating?: number; waterAccess?: boolean; cellSignal?: string }) {
  const where: Record<string, unknown> = {};
  if (input.type) where.type = input.type;
  if (input.waterAccess !== undefined) where.waterAccess = input.waterAccess;
  if (input.cellSignal) where.cellSignal = input.cellSignal;
  if (input.minRating) where.rating = { gte: input.minRating };

  const locations = await prisma.location.findMany({
    where,
    select: {
      id: true, name: true, type: true, rating: true,
      roadCondition: true, cellSignal: true, starlinkSignal: true,
      waterAccess: true, latitude: true, longitude: true, notes: true, visitedAt: true,
    },
    orderBy: { rating: 'desc' },
    take: 20,
  });

  return {
    count: locations.length,
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      rating: l.rating,
      roadCondition: l.roadCondition,
      cellSignal: l.cellSignal,
      starlinkSignal: l.starlinkSignal,
      waterAccess: l.waterAccess,
      coordinates: l.latitude && l.longitude ? { lat: l.latitude, lon: l.longitude } : null,
      notes: l.notes,
      lastVisited: l.visitedAt?.toISOString().split('T')[0] ?? null,
    })),
  };
}
