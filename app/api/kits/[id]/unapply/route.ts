import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/kits/[id]/unapply — remove kit-exclusive items from a trip
// Body: { tripId: string, gearIdsToRemove: string[] }
// Only deletes PackingItems where usageStatus is null (preserves trip feedback — Pitfall 5)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // id accepted for URL consistency with apply route; client computes gearIdsToRemove via computeGearIdsToRemove
    await params;
    const body = await request.json();

    if (!body.tripId || !Array.isArray(body.gearIdsToRemove)) {
      return NextResponse.json(
        { error: 'tripId and gearIdsToRemove are required' },
        { status: 400 }
      );
    }

    // Only delete items that have no feedback (preserve trip history)
    const { count } = await prisma.packingItem.deleteMany({
      where: {
        tripId: body.tripId,
        gearId: { in: body.gearIdsToRemove },
        usageStatus: null,
      },
    });

    return NextResponse.json({ removed: count });
  } catch (error) {
    console.error('Failed to unapply kit:', error);
    return NextResponse.json({ error: 'Failed to unapply kit' }, { status: 500 });
  }
}
