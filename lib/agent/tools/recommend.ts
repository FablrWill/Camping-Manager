import { prisma } from '@/lib/db';
import { hybridSearch } from '@/lib/rag/search';
import { executeGetWeather } from '@/lib/agent/tools/getWeather';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const recommendSpotsTool: Tool = {
  name: 'recommend_spots',
  description: 'Find camping spots matching the user\'s request. Searches saved locations first (Will\'s personal spots), then fills gaps from the NC camping knowledge base. Returns structured spot cards the user can save. Use when the user asks to find, recommend, or suggest camping spots.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Natural language description of what the user wants — e.g. "dispersed camping near Brevard with water access" or "quiet spot within 2 hours of Asheville for a weekend in June"',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum spots to return (default 5, max 8)',
      },
    },
    required: ['query'],
  },
};

interface Recommendation {
  id: string | null;
  name: string;
  description: string;
  type: string | null;
  rating: number | null;
  source: 'saved' | 'knowledge_base';
  distanceNote: string | null;
  coordinates: { lat: number; lon: number } | null;
  weatherSummary: { date: string; highF: number; lowF: number; precipPct: number; weatherCode: number }[] | null;
}

export async function executeRecommendSpots(input: { query: string; maxResults?: number }): Promise<string> {
  try {
    const maxResults = Math.min(input.maxResults ?? 5, 8);
    const recommendations: Recommendation[] = [];

    // --- Source 1: Will's saved locations (priority) ---
    const savedLocations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        rating: true,
        notes: true,
        description: true,
        latitude: true,
        longitude: true,
        waterAccess: true,
        roadCondition: true,
        cellSignal: true,
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    // Add saved locations as recommendations (ranked by rating desc)
    for (const loc of savedLocations) {
      const desc = loc.description ?? loc.notes ?? 'One of Will\'s saved spots.';
      recommendations.push({
        id: loc.id,
        name: loc.name,
        description: desc,
        type: loc.type,
        rating: loc.rating,
        source: 'saved',
        distanceNote: null,
        coordinates: loc.latitude && loc.longitude ? { lat: loc.latitude, lon: loc.longitude } : null,
        weatherSummary: null,
      });
    }

    // --- Source 2: RAG knowledge base (fill gaps) ---
    const ragResults = await hybridSearch(input.query, 10);

    for (const chunk of ragResults) {
      // Stop once we have enough candidates
      if (recommendations.length >= maxResults * 2) break;

      // Extract a spot name from the title (chunk title often contains location name)
      const name = chunk.title.replace(/^#+ /, '').trim();
      if (!name) continue;

      // Avoid duplicates with saved locations (rough name match)
      const alreadyHave = recommendations.some(
        (r) => r.name.toLowerCase() === name.toLowerCase()
      );
      if (alreadyHave) continue;

      recommendations.push({
        id: null,
        name,
        description: chunk.content.slice(0, 300).trim(),
        type: null,
        rating: null,
        source: 'knowledge_base',
        distanceNote: null,
        coordinates: null,
        weatherSummary: null,
      });
    }

    // Return top N results — saved locations always first
    const sorted = [
      ...recommendations.filter((r) => r.source === 'saved'),
      ...recommendations.filter((r) => r.source === 'knowledge_base'),
    ].slice(0, maxResults);

    // --- Source 3: Weather forecasts (best-effort enrichment) ---
    const weatherPromises = sorted.map(async (rec) => {
      if (!rec.coordinates) return;
      try {
        const raw = await executeGetWeather({
          latitude: rec.coordinates.lat,
          longitude: rec.coordinates.lon,
          days: 3,
        });
        const parsed = JSON.parse(raw);
        if (parsed.forecast) {
          rec.weatherSummary = parsed.forecast.slice(0, 3);
        }
      } catch {
        // Best-effort — leave weatherSummary as null
      }
    });
    await Promise.allSettled(weatherPromises);

    return JSON.stringify({
      action: 'recommendations',
      query: input.query,
      count: sorted.length,
      recommendations: sorted,
    });
  } catch (error) {
    return `Error: Failed to find recommendations — ${(error as Error).message}`;
  }
}
