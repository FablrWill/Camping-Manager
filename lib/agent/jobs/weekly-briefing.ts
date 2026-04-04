/**
 * weekly-briefing.ts — Job handler for weekly intelligence briefing.
 *
 * Aggregates results from the most recent deal_check, maintenance_due,
 * and trip_weather_alert jobs into a single briefing summary.
 * No Claude call needed — pure aggregation.
 */

import { prisma } from '@/lib/db';
import type { DealCheckResult } from './deal-check';
import type { MaintenanceDueResult } from './maintenance-due';
import type { TripWeatherAlertResult } from './trip-weather-alert';

export interface WeeklyBriefingPayload {
  // No input needed — reads from DB
}

export interface WeeklyBriefingResult {
  deals: {
    count: number;
    nearTarget: Array<{ name: string; estimatedPrice: number; targetPrice: number }>;
  };
  maintenance: {
    overdueCount: number;
    items: Array<{ name: string; daysOverdue: number }>;
  };
  weather: {
    alertCount: number;
    trips: Array<{ tripName: string; alerts: string[] }>;
  };
  generatedAt: string;
}

export async function processWeeklyBriefing(_payload: WeeklyBriefingPayload): Promise<WeeklyBriefingResult> {
  const [latestDealCheck, latestMaintenanceDue, latestWeatherAlert] = await Promise.all([
    prisma.agentJob.findFirst({
      where: { type: 'deal_check', status: 'done' },
      orderBy: { completedAt: 'desc' },
      select: { result: true },
    }),
    prisma.agentJob.findFirst({
      where: { type: 'maintenance_due', status: 'done' },
      orderBy: { completedAt: 'desc' },
      select: { result: true },
    }),
    prisma.agentJob.findFirst({
      where: { type: 'trip_weather_alert', status: 'done' },
      orderBy: { completedAt: 'desc' },
      select: { result: true },
    }),
  ]);

  // Parse deal check results
  const deals: WeeklyBriefingResult['deals'] = { count: 0, nearTarget: [] };
  if (latestDealCheck?.result) {
    try {
      const dealResult = JSON.parse(latestDealCheck.result) as DealCheckResult;
      const nearTargetItems = dealResult.items.filter((i) => i.isNearTarget);
      deals.count = nearTargetItems.length;
      deals.nearTarget = nearTargetItems.map((i) => ({
        name: i.name,
        estimatedPrice: i.estimatedPrice,
        targetPrice: i.targetPrice,
      }));
    } catch {
      // Malformed result — skip
    }
  }

  // Parse maintenance due results
  const maintenance: WeeklyBriefingResult['maintenance'] = { overdueCount: 0, items: [] };
  if (latestMaintenanceDue?.result) {
    try {
      const maintResult = JSON.parse(latestMaintenanceDue.result) as MaintenanceDueResult;
      maintenance.overdueCount = maintResult.overdueItems.length;
      maintenance.items = maintResult.overdueItems.map((i) => ({
        name: i.name,
        daysOverdue: i.daysOverdue,
      }));
    } catch {
      // Malformed result — skip
    }
  }

  // Parse weather alert results
  const weather: WeeklyBriefingResult['weather'] = { alertCount: 0, trips: [] };
  if (latestWeatherAlert?.result) {
    try {
      const weatherResult = JSON.parse(latestWeatherAlert.result) as TripWeatherAlertResult;
      weather.alertCount = weatherResult.tripAlerts.length;
      weather.trips = weatherResult.tripAlerts.map((t) => ({
        tripName: t.tripName,
        alerts: t.alerts.map((a) => a.message),
      }));
    } catch {
      // Malformed result — skip
    }
  }

  return {
    deals,
    maintenance,
    weather,
    generatedAt: new Date().toISOString(),
  };
}
