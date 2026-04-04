import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { researchGearItem } from '@/lib/claude';

// POST /api/gear/[id]/research — trigger Claude research for gear alternatives
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const item = await prisma.gearItem.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
    }

    const result = await researchGearItem({
      name: item.name,
      brand: item.brand,
      category: item.category,
      weight: item.weight,
      price: item.price,
      condition: item.condition,
    });

    const updated = await prisma.gearItem.update({
      where: { id },
      data: {
        researchResult: JSON.stringify(result),
        researchedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to research gear item:', error);
    return NextResponse.json({ error: 'Failed to research gear item' }, { status: 500 });
  }
}
