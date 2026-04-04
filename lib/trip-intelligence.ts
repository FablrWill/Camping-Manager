import { anthropic } from '@/lib/claude';
import { parseClaudeJSON, TripIntelligenceReportSchema } from '@/lib/parse-claude';
import { prisma } from '@/lib/db';

export interface TripIntelligenceReport {
  stats: {
    tripCount: number;
    avgNights: number;
    totalNights: number;
    topSeason: string;
    avgDriveMiles: number;
  };
  patterns: string[];
  gearInsights: {
    name: string;
    insight: string;
    action: 'keep' | 'reconsider' | 'always_bring';
  }[];
  spotsToRevisit: { name: string; reason: string }[];
  generatedAt: string;
}

// Asheville, NC coordinates (Will's home base)
const HOME_LAT = 35.5951;
const HOME_LON = -82.5515;

function differenceInDays(end: Date, start: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

export async function generateTripIntelligence(): Promise<TripIntelligenceReport> {
  const trips = await prisma.trip.findMany({
    include: {
      location: true,
      packingItems: {
        include: { gear: true },
      },
      tripFeedbacks: true,
      mealPlan: true,
    },
    orderBy: { startDate: 'desc' },
  });

  // Compute local stats
  const tripCount = trips.length;

  const nightsPerTrip: number[] = trips.map((t) => {
    const nights = differenceInDays(new Date(t.endDate), new Date(t.startDate));
    return Math.max(0, nights);
  });

  const totalNights: number = nightsPerTrip.reduce((sum: number, n: number) => sum + n, 0);
  const avgNights = tripCount > 0 ? totalNights / tripCount : 0;

  // Top season
  const seasonCounts: Record<string, number> = { spring: 0, summer: 0, fall: 0, winter: 0 };
  for (const trip of trips) {
    const month = new Date(trip.startDate).getMonth() + 1; // 1-based
    const season = getSeason(month);
    seasonCounts[season]++;
  }
  const topSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

  // Avg drive miles (haversine from Asheville)
  const tripsWithCoords = trips.filter(
    (t) => t.location?.latitude != null && t.location?.longitude != null
  );
  const avgDriveMiles =
    tripsWithCoords.length > 0
      ? Math.round(
          tripsWithCoords.reduce((sum: number, t) => {
            const dist = haversineDistanceMiles(
              HOME_LAT,
              HOME_LON,
              t.location!.latitude!,
              t.location!.longitude!
            );
            return sum + dist;
          }, 0) / tripsWithCoords.length
        )
      : 0;

  // Build data summary for Claude
  const tripSummaries = trips.map((trip, idx) => {
    const nights = nightsPerTrip[idx];
    const month = new Date(trip.startDate).getMonth() + 1;
    const season = getSeason(month);
    const year = new Date(trip.startDate).getFullYear();
    const locationName = trip.location?.name ?? 'Unknown location';
    const feedbackSummary = trip.tripFeedbacks
      .map((f) => f.summary ?? '')
      .filter(Boolean)
      .join('; ');
    const gearUsage = trip.packingItems
      .filter((pi) => pi.usageStatus != null)
      .map((pi) => `${pi.gear.name}: ${pi.usageStatus}`)
      .join(', ');
    return (
      `Trip ${idx + 1}: "${trip.name}" — ${season} ${year}, ${nights} nights at ${locationName}` +
      (feedbackSummary ? `. Feedback: ${feedbackSummary}` : '') +
      (gearUsage ? `. Gear usage: ${gearUsage}` : '')
    );
  });

  const gearUsageCounts: Record<string, { used: number; didntNeed: number; forgot: number }> = {};
  for (const trip of trips) {
    for (const pi of trip.packingItems) {
      if (!gearUsageCounts[pi.gear.name]) {
        gearUsageCounts[pi.gear.name] = { used: 0, didntNeed: 0, forgot: 0 };
      }
      if (pi.usageStatus === 'used') gearUsageCounts[pi.gear.name].used++;
      else if (pi.usageStatus === "didn't need") gearUsageCounts[pi.gear.name].didntNeed++;
      else if (pi.usageStatus === 'forgot but needed') gearUsageCounts[pi.gear.name].forgot++;
    }
  }

  const gearSummaryLines = Object.entries(gearUsageCounts)
    .filter(([, counts]) => counts.used + counts.didntNeed + counts.forgot > 0)
    .map(
      ([name, counts]) =>
        `${name}: used ${counts.used}x, didn't need ${counts.didntNeed}x, forgot but needed ${counts.forgot}x`
    );

  const seasonBreakdown = Object.entries(seasonCounts)
    .map(([s, c]) => `${s}: ${c}`)
    .join(', ');

  const dataSummary = [
    `Total trips: ${tripCount}`,
    `Season breakdown: ${seasonBreakdown}`,
    '',
    'Trip details:',
    ...tripSummaries,
    '',
    'Gear usage across all trips:',
    ...gearSummaryLines,
  ].join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system:
      "You are a camping analytics expert. Analyze this camper's trip history and provide insights. Return JSON matching the schema exactly. No markdown fences, just raw JSON.",
    messages: [
      {
        role: 'user',
        content: `Analyze this camping history and return a JSON object with:
- "patterns": array of 3-5 string observations about this camper's style, habits, or tendencies
- "gearInsights": array of objects { "name": string, "insight": string, "action": "keep" | "reconsider" | "always_bring" } — focus on gear with notable usage patterns
- "spotsToRevisit": array of objects { "name": string, "reason": string } — locations worth returning to based on feedback or patterns

Camping data:
${dataSummary}`,
      },
    ],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const parseResult = parseClaudeJSON(rawText, TripIntelligenceReportSchema);

  const claudeData = parseResult.success
    ? parseResult.data
    : { patterns: [], gearInsights: [], spotsToRevisit: [] };

  return {
    stats: {
      tripCount,
      avgNights: Math.round(avgNights * 10) / 10,
      totalNights,
      topSeason,
      avgDriveMiles,
    },
    patterns: claudeData.patterns,
    gearInsights: claudeData.gearInsights,
    spotsToRevisit: claudeData.spotsToRevisit,
    generatedAt: new Date().toISOString(),
  };
}
