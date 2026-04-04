import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/kits/[id] — fetch a single kit
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const kit = await prisma.kitPreset.findUnique({ where: { id } });

    if (!kit) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    return NextResponse.json(kit);
  } catch (error) {
    console.error('Failed to fetch kit:', error);
    return NextResponse.json({ error: 'Failed to fetch kit' }, { status: 500 });
  }
}

// PUT /api/kits/[id] — update a kit preset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (Array.isArray(body.gearIds)) data.gearIds = JSON.stringify(body.gearIds);

    const kit = await prisma.kitPreset.update({
      where: { id },
      data,
    });

    return NextResponse.json(kit);
  } catch (error) {
    console.error('Failed to update kit:', error);
    return NextResponse.json({ error: 'Failed to update kit' }, { status: 500 });
  }
}

// DELETE /api/kits/[id] — delete a kit preset
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await prisma.kitPreset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete kit:', error);
    return NextResponse.json({ error: 'Failed to delete kit' }, { status: 500 });
  }
}
