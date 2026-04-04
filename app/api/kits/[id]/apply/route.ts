import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/kits/[id]/apply — apply a kit preset to a trip
// Body: { tripId: string }
// Creates PackingItems for all gear in the kit that aren't already packed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    const kit = await prisma.kitPreset.findUnique({ where: { id } });
    if (!kit) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const gearIds = JSON.parse(kit.gearIds) as string[];

    // Find which gear items are already packed for this trip
    const existing = await prisma.packingItem.findMany({
      where: { tripId: body.tripId, gearId: { in: gearIds } },
      select: { gearId: true },
    });
    const existingSet = new Set(existing.map((e) => e.gearId));

    // Create PackingItems for gear not already in the trip
    const toAdd = gearIds.filter((gid) => !existingSet.has(gid));

    if (toAdd.length > 0) {
      await prisma.packingItem.createMany({
        data: toAdd.map((gearId) => ({
          tripId: body.tripId,
          gearId,
          packed: false,
        })),
      });
    }

    return NextResponse.json({
      added: toAdd.length,
      skipped: existingSet.size,
      total: gearIds.length,
    });
  } catch (error) {
    console.error('Failed to apply kit:', error);
    return NextResponse.json({ error: 'Failed to apply kit' }, { status: 500 });
  }
}
