/**
 * Destination discovery scoring engine for S31.
 *
 * Scores Will's saved locations using weather, recency, seasonal rating,
 * and driving distance from Asheville NC (35.5°N, 82.5°W).
 *
 * Point totals:
 *   Weather   0-40 pts
 *   Recency   0-15 pts
 *   Seasonal  6-30 pts  (storedRating × 6)
 *   Distance  0-15 pts
 *   Dog boost +5 pts    (if bringingDog and notes mention "dog")
 *   Max raw   ~105 pts  (normalized to 0-100)
 */

import { fetchWeather } from '@/lib/weather';

// Asheville, NC coordinates (home base)
const HOME_LAT = 35.5;
const HOME_LON = -82.5;

// Straight-line degrees → km (approx at mid-latitudes)
const KM_PER_DEGREE_LAT = 111.0;
const KM_PER_DEGREE_LON = 86.0; // at ~35° latitude

// km/h used for drive-time estimate (straight-line → road time proxy)
const DRIVE_SPEED_KMH = 97; // ~60 mph

export interface LocationInput {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  visitedAt: Date | string | null;
  notes: string | null;
  type: string | null;
}

export interface DestinationSuggestion {
  locationId: string;
  name: string;
  score: number;               // 0-100
  scoreBreakdown: {
    weather: number;           // 0-40
    recency: number;           // 0-15
    seasonal: number;          // 6-30
    distance: number;          // 0-15
    dogBoost: number;          // 0-5
  };
  driveHours: number | null;   // estimated one-way drive hours
  weatherSummary: string;      // human-readable summary
  weatherEmoji: string;
  avgHighF: number | null;
  avgPrecipPct: number | null;
  reason: string;              // 1-sentence explanation
}

interface SuggestionRequest {
  locations: LocationInput[];
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD
  maxResults?: number;
  bringingDog?: boolean;
}

/**
 * Straight-line distance in km between two lat/lon points.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * KM_PER_DEGREE_LAT;
  const dLon = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180)) * (KM_PER_DEGREE_LON / 0.97);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Score 0-15 based on drive time from Asheville.
 *
 * Sweet spot: 1-3 hours (score 15).
 * Penalty for very short (<30 min) or very long (>5 hr).
 */
function scoreDistance(distKm: number): { score: number; driveHours: number } {
  const driveHours = distKm / DRIVE_SPEED_KMH;

  let score: number;
  if (driveHours <= 0.5) {
    score = 8; // too close — little adventure value
  } else if (driveHours <= 3) {
    score = 15; // sweet spot
  } else if (driveHours <= 5) {
    // Linear decay from 15 → 5 over 3-5 hrs
    score = Math.round(15 - ((driveHours - 3) / 2) * 10);
  } else {
    score = 0;
  }

  return { score, driveHours: Math.round(driveHours * 10) / 10 };
}

/**
 * Score 0-15 based on how recently Will visited.
 *
 * More than 12 months ago (or never visited) = 15 pts (ripe for revisit).
 * Within last 3 months = 0 pts (too recent).
 */
function scoreRecency(visitedAt: Date | string | null): number {
  if (!visitedAt) return 15; // never visited — high priority

  const visited = visitedAt instanceof Date ? visitedAt : new Date(visitedAt);
  const monthsAgo = (Date.now() - visited.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo < 3) return 0;
  if (monthsAgo < 6) return 5;
  if (monthsAgo < 12) return 10;
  return 15;
}

/**
 * Score 6-30 from stored rating (1-5 stars × 6).
 * Unrated locations get neutral 12 pts (equivalent to 2-star).
 */
function scoreSeasonal(rating: number | null): number {
  const r = rating ?? 2;
  return Math.max(1, Math.min(5, r)) * 6;
}

/**
 * Score 0-40 from weather data.
 *
 * Ideal camping: highs 65-80°F, <20% precip chance.
 * Penalize rain, extreme heat/cold.
 */
function scoreWeather(
  avgHighF: number,
  avgLowF: number,
  avgPrecipPct: number,
): number {
  let score = 40;

  // Temperature scoring (out of 20 pts)
  if (avgHighF >= 65 && avgHighF <= 80) {
    score = score; // ideal
  } else if (avgHighF > 80 && avgHighF <= 90) {
    score -= 5;
  } else if (avgHighF > 90) {
    score -= 15;
  } else if (avgHighF < 55) {
    score -= 10;
  } else if (avgHighF < 45) {
    score -= 20;
  }

  // Cold nights penalty
  if (avgLowF < 32) score -= 10;
  else if (avgLowF < 40) score -= 5;

  // Rain penalty (out of 20 pts)
  if (avgPrecipPct >= 70) {
    score -= 20;
  } else if (avgPrecipPct >= 50) {
    score -= 14;
  } else if (avgPrecipPct >= 30) {
    score -= 7;
  } else if (avgPrecipPct >= 20) {
    score -= 3;
  }

  return Math.max(0, Math.min(40, score));
}

/**
 * Build a 1-sentence human reason for suggesting the location.
 */
function buildReason(
  name: string,
  breakdown: DestinationSuggestion['scoreBreakdown'],
  driveHours: number | null,
  weatherSummary: string,
): string {
  const parts: string[] = [];

  if (breakdown.weather >= 35) {
    parts.push(`${weatherSummary} forecast looks great`);
  } else if (breakdown.weather >= 20) {
    parts.push(`decent ${weatherSummary} conditions`);
  } else {
    parts.push(`weather is marginal`);
  }

  if (breakdown.recency === 15) {
    parts.push("you haven't been here before");
  } else if (breakdown.recency >= 10) {
    parts.push("it's been over a year");
  } else if (breakdown.recency >= 5) {
    parts.push("haven't been in a few months");
  }

  if (driveHours !== null && driveHours <= 3) {
    parts.push(`${driveHours}h drive`);
  } else if (driveHours !== null) {
    parts.push(`${driveHours}h away`);
  }

  if (breakdown.dogBoost > 0) parts.push('dog-friendly notes');

  if (parts.length === 0) return `${name} is a solid option this weekend.`;
  return `${name}: ${parts.join(', ')}.`;
}

/**
 * Score and rank locations for a given date range.
 * Returns up to maxResults suggestions sorted by score descending.
 *
 * Locations without coordinates are included but scored 0 for weather/distance.
 */
export async function suggestDestinations(
  request: SuggestionRequest,
): Promise<DestinationSuggestion[]> {
  const { locations, startDate, endDate, maxResults = 5, bringingDog = false } = request;

  // Filter: require at least name
  const candidates = locations.filter((loc) => loc.name);

  // Fetch weather for all locations with coordinates concurrently
  const weatherMap = new Map<
    string,
    { avgHighF: number; avgLowF: number; avgPrecipPct: number; summary: string; emoji: string }
  >();

  const locationsWithCoords = candidates.filter(
    (loc) => loc.latitude !== null && loc.longitude !== null,
  );

  // Graceful fallback: only attempt weather if we have coords
  if (locationsWithCoords.length > 0) {
    const weatherFetches = locationsWithCoords.map(async (loc) => {
      try {
        const forecast = await fetchWeather(
          loc.latitude as number,
          loc.longitude as number,
          startDate,
          endDate,
        );

        if (forecast.days.length === 0) return;

        const avgHighF = Math.round(
          forecast.days.reduce((sum, d) => sum + d.highF, 0) / forecast.days.length,
        );
        const avgLowF = Math.round(
          forecast.days.reduce((sum, d) => sum + d.lowF, 0) / forecast.days.length,
        );
        const avgPrecipPct = Math.round(
          forecast.days.reduce((sum, d) => sum + d.precipProbability, 0) / forecast.days.length,
        );

        // Use day 1 weather code for emoji/summary
        const firstDay = forecast.days[0];

        weatherMap.set(loc.id, {
          avgHighF,
          avgLowF,
          avgPrecipPct,
          summary: `${avgHighF}°F highs, ${avgPrecipPct}% rain`,
          emoji: firstDay.weatherEmoji,
        });
      } catch {
        // Best-effort — leave this location without weather scoring
      }
    });

    await Promise.allSettled(weatherFetches);
  }

  // Score all candidates
  const scored: DestinationSuggestion[] = candidates.map((loc) => {
    const weather = weatherMap.get(loc.id);

    const weatherScore = weather
      ? scoreWeather(weather.avgHighF, weather.avgLowF, weather.avgPrecipPct)
      : 20; // neutral if no coords/weather

    const recencyScore = scoreRecency(loc.visitedAt);
    const seasonalScore = scoreSeasonal(loc.rating);

    let distanceScore = 10; // neutral default
    let driveHours: number | null = null;

    if (loc.latitude !== null && loc.longitude !== null) {
      const distKm = haversineKm(HOME_LAT, HOME_LON, loc.latitude, loc.longitude);
      const distResult = scoreDistance(distKm);
      distanceScore = distResult.score;
      driveHours = distResult.driveHours;
    }

    const dogBoost =
      bringingDog && loc.notes?.toLowerCase().includes('dog') ? 5 : 0;

    const breakdown = {
      weather: weatherScore,
      recency: recencyScore,
      seasonal: seasonalScore,
      distance: distanceScore,
      dogBoost,
    };

    // Normalize to 0-100
    // Max raw = 40 + 15 + 30 + 15 + 5 = 105
    const rawTotal =
      breakdown.weather +
      breakdown.recency +
      breakdown.seasonal +
      breakdown.distance +
      breakdown.dogBoost;

    const score = Math.round((rawTotal / 105) * 100);

    const weatherSummary = weather ? weather.summary : 'no forecast available';
    const weatherEmoji = weather ? weather.emoji : '🌡️';

    return {
      locationId: loc.id,
      name: loc.name,
      score,
      scoreBreakdown: breakdown,
      driveHours,
      weatherSummary,
      weatherEmoji,
      avgHighF: weather?.avgHighF ?? null,
      avgPrecipPct: weather?.avgPrecipPct ?? null,
      reason: buildReason(loc.name, breakdown, driveHours, weatherSummary),
    };
  });

  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
