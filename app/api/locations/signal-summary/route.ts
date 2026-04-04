import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { aggregateSignalSummaries, SignalSummary } from '@/lib/signal-summary';

export async function GET(): Promise<NextResponse> {
  try {
    const [logs, locations] = await Promise.all([
      prisma.signalLog.findMany({
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.location.findMany({
        select: { id: true, cellSignal: true, starlinkSignal: true },
      }),
    ]);

    // Group logs by locationId
    const logsByLocation = new Map<
      string,
      Array<{
        cellBars: number | null;
        cellType: string | null;
        starlinkQuality: string | null;
      }>
    >();
    for (const log of logs) {
      const existing = logsByLocation.get(log.locationId) ?? [];
      logsByLocation.set(log.locationId, [
        ...existing,
        {
          cellBars: log.cellBars,
          cellType: log.cellType,
          starlinkQuality: log.starlinkQuality,
        },
      ]);
    }

    // Build result record
    const result: Record<string, SignalSummary> = {};
    for (const location of locations) {
      const locationLogs = logsByLocation.get(location.id) ?? [];
      result[location.id] = aggregateSignalSummaries(
        locationLogs,
        location.cellSignal,
        location.starlinkSignal
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch signal summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signal summaries' },
      { status: 500 }
    );
  }
}
