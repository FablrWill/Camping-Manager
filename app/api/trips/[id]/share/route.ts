import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSlug } from '@/lib/share-location';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/trips/[id]/share — generate a share token (idempotent)
export async function POST(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Idempotent — return existing token if already shared
    if (trip.shareToken) {
      return NextResponse.json({ shareUrl: `/trips/share/${trip.shareToken}` });
    }

    const shareToken = generateSlug();
    await prisma.trip.update({ where: { id }, data: { shareToken } });

    return NextResponse.json({ shareUrl: `/trips/share/${shareToken}` });
  } catch (error) {
    console.error('Failed to generate share token:', error);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

// DELETE /api/trips/[id]/share — clear the share token (unshare)
export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    await prisma.trip.update({ where: { id }, data: { shareToken: null } });

    return NextResponse.json({ unshared: true });
  } catch (error) {
    console.error('Failed to clear share token:', error);
    return NextResponse.json({ error: 'Failed to unshare trip' }, { status: 500 });
  }
}
