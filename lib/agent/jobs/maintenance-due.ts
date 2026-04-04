/**
 * maintenance-due.ts — Job handler for gear maintenance reminders.
 *
 * Queries gear items with maintenance intervals set, calculates overdue items
 * using date math. No Claude call needed — pure DB query.
 */

import { prisma } from '@/lib/db';

export interface MaintenanceDuePayload {
  // No input needed — queries DB directly
}

export interface MaintenanceDueItem {
  gearItemId: string;
  name: string;
  lastMaintenance: string | null;
  intervalDays: number;
  daysOverdue: number;
}

export interface MaintenanceDueResult {
  overdueItems: MaintenanceDueItem[];
  checkedAt: string;
}

export async function processMaintenanceDue(_payload: MaintenanceDuePayload): Promise<MaintenanceDueResult> {
  const gearWithMaintenance = await prisma.gearItem.findMany({
    where: { maintenanceIntervalDays: { not: null } },
    select: {
      id: true,
      name: true,
      lastMaintenanceAt: true,
      maintenanceIntervalDays: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueItems: MaintenanceDueItem[] = [];

  for (const gear of gearWithMaintenance) {
    const intervalDays = gear.maintenanceIntervalDays!;

    if (gear.lastMaintenanceAt === null) {
      // Never maintained — treat as overdue from today (0 days overdue but flagged)
      overdueItems.push({
        gearItemId: gear.id,
        name: gear.name,
        lastMaintenance: null,
        intervalDays,
        daysOverdue: 0,
      });
      continue;
    }

    const lastMaintenance = new Date(gear.lastMaintenanceAt);
    lastMaintenance.setHours(0, 0, 0, 0);

    const daysSinceMaintenance = Math.floor(
      (today.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysOverdue = daysSinceMaintenance - intervalDays;

    if (daysOverdue >= 0) {
      overdueItems.push({
        gearItemId: gear.id,
        name: gear.name,
        lastMaintenance: gear.lastMaintenanceAt.toISOString(),
        intervalDays,
        daysOverdue,
      });
    }
  }

  return { overdueItems, checkedAt: new Date().toISOString() };
}
