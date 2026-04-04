import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findGearManual } from '@/lib/claude';

// POST /api/gear/:id/documents/find — Claude-powered manual finder
// Returns predicted document URLs — does NOT auto-save (UI confirms before saving)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.gearItem.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
    }

    const result = await findGearManual({
      name: item.name,
      brand: item.brand,
      modelNumber: item.modelNumber,
      category: item.category,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to find gear manual:', error);
    return NextResponse.json({ error: 'Failed to find gear manual' }, { status: 500 });
  }
}
