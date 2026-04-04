const METERS_TO_FEET = 3.28084;

export const ALTITUDE_THRESHOLDS = {
  moderate: 6000, // ft
  high: 9000,     // ft
} as const;

export type AltitudeLevel = 'none' | 'moderate' | 'high';

export interface AltitudeWarning {
  level: AltitudeLevel;
  tips: string[];
}

/**
 * Returns altitude warning info for a given elevation in feet.
 * Returns null if below threshold (< 6000ft).
 * DB stores altitude in meters — convert with metersToFeet() before calling.
 */
export function getAltitudeWarning(altitudeFt: number): AltitudeWarning | null {
  if (altitudeFt < ALTITUDE_THRESHOLDS.moderate) return null;

  const level: AltitudeLevel = altitudeFt >= ALTITUDE_THRESHOLDS.high ? 'high' : 'moderate';

  const tips: string[] = [
    `Cooking: add 1–2 min boil time per 1,000 ft above 5,000 ft`,
    'Hydration: drink an extra litre of water per day',
    'Sleep: first night may feel rough — symptoms usually resolve by day 2',
  ];

  if (altitudeFt >= 8000) {
    tips.push('Bring extra fuel — stoves run less efficiently at altitude');
  }

  return { level, tips };
}

/** Convert meters (as stored in DB from EXIF) to feet. */
export function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}
