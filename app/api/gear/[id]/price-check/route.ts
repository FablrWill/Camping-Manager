import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGearPriceCheck } from '@/lib/claude';

// GET /api/gear/[id]/price-check — fetch existing price check result
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const priceCheck = await prisma.gearPriceCheck.findUnique({
      where: { gearItemId: id },
    });

    if (!priceCheck) {
      return NextResponse.json({ error: 'Price check not found' }, { status: 404 });
    }

    return NextResponse.json(priceCheck);
  } catch (error) {
    console.error('Failed to fetch price check:', error);
    return NextResponse.json({ error: 'Failed to fetch price check' }, { status: 500 });
  }
}

// POST /api/gear/[id]/price-check — trigger Claude price check
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

    const result = await generateGearPriceCheck({
      name: item.name,
      brand: item.brand,
      modelNumber: item.modelNumber,
      category: item.category,
      price: item.price,
      targetPrice: item.targetPrice,
    });

    if (!result.success) {
      console.error('Failed to generate price check:', result.error);
      return NextResponse.json({ error: 'Failed to generate price check' }, { status: 500 });
    }

    const { foundPriceRange, foundPriceLow, retailers, disclaimer } = result.data;

    const isAtOrBelowTarget =
      item.targetPrice != null ? foundPriceLow <= item.targetPrice : false;

    const saved = await prisma.gearPriceCheck.upsert({
      where: { gearItemId: id },
      create: {
        gearItemId: id,
        foundPriceRange,
        foundPriceLow,
        retailers: JSON.stringify(retailers),
        disclaimer,
        isAtOrBelowTarget,
        checkedAt: new Date(),
      },
      update: {
        foundPriceRange,
        foundPriceLow,
        retailers: JSON.stringify(retailers),
        disclaimer,
        isAtOrBelowTarget,
        checkedAt: new Date(),
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to run price check:', error);
    return NextResponse.json({ error: 'Failed to run price check' }, { status: 500 });
  }
}
