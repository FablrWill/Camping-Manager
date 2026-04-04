import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trails/[id] — return full trail record including geoJson
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const trail = await prisma.trail.findUnique({
      where: { id },
    });
    if (!trail) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }
    return NextResponse.json(trail);
  } catch (error) {
    console.error('Failed to fetch trail:', error);
    return NextResponse.json({ error: 'Failed to fetch trail' }, { status: 500 });
  }
}

// DELETE /api/trails/[id] — remove a trail
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await prisma.trail.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete trail:', error);
    return NextResponse.json({ error: 'Failed to delete trail' }, { status: 500 });
  }
}
