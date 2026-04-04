import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trails — list all trails (geoJson excluded, fetched per-trail when needed)
export async function GET(): Promise<NextResponse> {
  try {
    const trails = await prisma.trail.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        color: true,
        distanceKm: true,
        sourceFile: true,
        createdAt: true,
      },
    });
    return NextResponse.json(trails);
  } catch (error) {
    console.error('Failed to fetch trails:', error);
    return NextResponse.json({ error: 'Failed to fetch trails' }, { status: 500 });
  }
}
