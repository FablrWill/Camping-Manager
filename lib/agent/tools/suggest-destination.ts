import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { prisma } from '@/lib/db';
import { suggestDestinations } from '@/lib/destination-discovery';

export const suggestDestinationTool: Tool = {
  name: 'suggest_destination',
  description:
    "Suggest the best of Will's saved camping spots for a specific weekend or date range. " +
    'Scores each location using weather forecast, how recently Will visited, stored rating, ' +
    'and driving distance from Asheville NC. ' +
    'Use when Will asks "where should I go?", "what spot is good this weekend?", ' +
    '"recommend a destination", or similar.',
  input_schema: {
    type: 'object' as const,
    properties: {
      startDate: {
        type: 'string',
        description: 'Trip start date in YYYY-MM-DD format.',
      },
      endDate: {
        type: 'string',
        description: 'Trip end date in YYYY-MM-DD format.',
      },
      maxResults: {
        type: 'number',
        description: 'How many suggestions to return (default 3, max 8).',
      },
      bringingDog: {
        type: 'boolean',
        description:
          'Set true if Will is bringing his dog. Boosts locations whose notes mention "dog".',
      },
    },
    required: ['startDate', 'endDate'],
  },
};

export async function executeSuggestDestination(input: {
  startDate: string;
  endDate: string;
  maxResults?: number;
  bringingDog?: boolean;
}): Promise<string> {
  try {
    const maxResults = Math.min(input.maxResults ?? 3, 8);

    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        rating: true,
        visitedAt: true,
        notes: true,
        type: true,
      },
    });

    if (locations.length === 0) {
      return JSON.stringify({
        action: 'destination_suggestions',
        count: 0,
        suggestions: [],
        message: "You don't have any saved locations yet. Add some spots first!",
      });
    }

    const suggestions = await suggestDestinations({
      locations,
      startDate: input.startDate,
      endDate: input.endDate,
      maxResults,
      bringingDog: input.bringingDog ?? false,
    });

    return JSON.stringify({
      action: 'destination_suggestions',
      startDate: input.startDate,
      endDate: input.endDate,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    return `Error: Failed to suggest destinations — ${(error as Error).message}`;
  }
}
