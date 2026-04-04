import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGearResearch } from '@/lib/claude';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const research = await prisma.gearResearch.findUnique({
      where: { gearItemId: id },
    });
    if (!research) {
      return NextResponse.json({ error: 'No research found' }, { status: 404 });
    }
    return NextResponse.json({
      ...JSON.parse(research.result),
      id: research.id,
      researchedAt: research.researchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch gear research:', error);
    return NextResponse.json({ error: 'Failed to fetch gear research' }, { status: 500 });
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

    const result = await generateGearResearch({
      name: item.name,
      brand: item.brand,
      modelNumber: item.modelNumber,
      category: item.category,
      condition: item.condition,
      price: item.price,
    });

    const saved = await prisma.gearResearch.upsert({
      where: { gearItemId: id },
      create: {
        gearItemId: id,
        result: JSON.stringify(result),
        verdict: result.verdict,
        researchedAt: new Date(),
      },
      update: {
        result: JSON.stringify(result),
        verdict: result.verdict,
        researchedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...result,
      id: saved.id,
      researchedAt: saved.researchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate gear research:', error);
    return NextResponse.json({ error: 'Failed to generate gear research' }, { status: 500 });
  }
}
