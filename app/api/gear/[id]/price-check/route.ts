import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGearPriceCheck } from '@/lib/claude';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const priceCheck = await prisma.gearPriceCheck.findUnique({
      where: { gearItemId: id },
    });
    if (!priceCheck) {
      return NextResponse.json({ error: 'No price check found' }, { status: 404 });
    }
    return NextResponse.json({
      id: priceCheck.id,
      gearItemId: priceCheck.gearItemId,
      foundPriceRange: priceCheck.foundPriceRange,
      foundPriceLow: priceCheck.foundPriceLow,
      isAtOrBelowTarget: priceCheck.isAtOrBelowTarget,
      checkedAt: priceCheck.checkedAt.toISOString(),
      createdAt: priceCheck.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch gear price check:', error);
    return NextResponse.json({ error: 'Failed to fetch gear price check' }, { status: 500 });
  }
}

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

    const result = await generateGearPriceCheck({
      name: item.name,
      brand: item.brand,
      modelNumber: item.modelNumber,
      category: item.category,
      price: item.price,
      targetPrice: item.targetPrice,
    });

    const isAtOrBelowTarget = item.targetPrice != null
      ? result.foundPriceLow <= item.targetPrice
      : false;

    const saved = await prisma.gearPriceCheck.upsert({
      where: { gearItemId: id },
      create: {
        gearItemId: id,
        foundPriceRange: result.foundPriceRange,
        foundPriceLow: result.foundPriceLow,
        checkedAt: new Date(),
        isAtOrBelowTarget,
      },
      update: {
        foundPriceRange: result.foundPriceRange,
        foundPriceLow: result.foundPriceLow,
        checkedAt: new Date(),
        isAtOrBelowTarget,
      },
    });

    return NextResponse.json({
      id: saved.id,
      gearItemId: saved.gearItemId,
      foundPriceRange: saved.foundPriceRange,
      foundPriceLow: saved.foundPriceLow,
      isAtOrBelowTarget: saved.isAtOrBelowTarget,
      checkedAt: saved.checkedAt.toISOString(),
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to run gear price check:', error);
    return NextResponse.json({ error: 'Failed to run gear price check' }, { status: 500 });
  }
}
