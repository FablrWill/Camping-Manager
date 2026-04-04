import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/kits — list all kit presets
export async function GET(): Promise<NextResponse> {
  try {
    const kits = await prisma.kitPreset.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(kits);
  } catch (error) {
    console.error('Failed to fetch kits:', error);
    return NextResponse.json({ error: 'Failed to fetch kits' }, { status: 500 });
  }
}

// POST /api/kits — create a new kit preset
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.name || !Array.isArray(body.gearIds)) {
      return NextResponse.json(
        { error: 'name and gearIds (array) are required' },
        { status: 400 }
      );
    }

    const kit = await prisma.kitPreset.create({
      data: {
        name: body.name,
        description: body.description || null,
        gearIds: JSON.stringify(body.gearIds),
      },
    });

    return NextResponse.json(kit, { status: 201 });
  } catch (error) {
    console.error('Failed to create kit:', error);
    return NextResponse.json({ error: 'Failed to create kit' }, { status: 500 });
  }
}
