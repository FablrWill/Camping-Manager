/**
 * trip-weather-alert.ts — Job handler for trip weather alerts.
 *
 * Checks upcoming trips (within 5 days) for bad weather conditions
 * using the Open-Meteo weather API via lib/weather.ts.
 */

import { prisma } from '@/lib/db';
import { fetchWeather, type WeatherAlert } from '@/lib/weather';

export interface TripWeatherAlertPayload {
  // No input needed — queries DB directly
}

export interface TripAlert {
  tripId: string;
  tripName: string;
  startDate: string;
  alerts: WeatherAlert[];
}

export interface TripWeatherAlertResult {
  tripAlerts: TripAlert[];
  checkedAt: string;
}

export async function processTripWeatherAlert(_payload: TripWeatherAlertPayload): Promise<TripWeatherAlertResult> {
  const now = new Date();
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const upcomingTrips = await prisma.trip.findMany({
    where: {
      startDate: { gte: now, lte: fiveDaysFromNow },
      locationId: { not: null },
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      location: {
        select: { latitude: true, longitude: true },
      },
    },
  });

  const tripAlerts: TripAlert[] = [];

  for (const trip of upcomingTrips) {
    const lat = trip.location?.latitude;
    const lon = trip.location?.longitude;

    if (lat == null || lon == null) {
      continue;
    }

    try {
      const startDate = trip.startDate.toISOString().split('T')[0];
      const endDate = trip.endDate.toISOString().split('T')[0];

      const forecast = await fetchWeather(lat, lon, startDate, endDate);

      // Collect alerts from API-level alerts
      const alerts: WeatherAlert[] = [...forecast.alerts];

      // Also flag individual threshold breaches per day
      for (const day of forecast.days) {
        if (day.precipProbability > 60 && !alerts.some((a) => a.type === 'rain')) {
          alerts.push({
            type: 'rain',
            message: `High precipitation probability (${day.precipProbability}%) on ${day.dayLabel}`,
            severity: 'warning',
          });
        }
        if (day.highF >= 100 && !alerts.some((a) => a.type === 'heat')) {
          alerts.push({
            type: 'heat',
            message: `Extreme heat expected: high of ${day.highF}°F on ${day.dayLabel}`,
            severity: 'warning',
          });
        }
        if (day.lowF <= 25 && !alerts.some((a) => a.type === 'cold')) {
          alerts.push({
            type: 'cold',
            message: `Freezing temperatures: low of ${day.lowF}°F on ${day.dayLabel}`,
            severity: 'warning',
          });
        }
        if (day.windGustMph >= 40 && !alerts.some((a) => a.type === 'wind')) {
          alerts.push({
            type: 'wind',
            message: `High wind gusts expected: ${day.windGustMph} mph on ${day.dayLabel}`,
            severity: 'warning',
          });
        }
      }

      if (alerts.length > 0) {
        tripAlerts.push({
          tripId: trip.id,
          tripName: trip.name,
          startDate: trip.startDate.toISOString(),
          alerts,
        });
      }
    } catch (err) {
      console.error(`[trip-weather-alert] Failed to fetch weather for trip ${trip.id}:`, err);
      // Skip this trip on error — don't fail the whole job
    }
  }

  return { tripAlerts, checkedAt: new Date().toISOString() };
}
