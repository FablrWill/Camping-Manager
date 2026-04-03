import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Prevent stale cache for family viewers who load the public share link
export const dynamic = 'force-dynamic';

/**
 * GET /api/share/location/[slug]
 * Public read-only endpoint — returns the shared location for the given slug.
 * Returns 404 if the slug is not found.
 * This route is intentionally public: it is the backing endpoint for the
 * shareable map link sent to family/friends.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // Next.js 15+ async params
  try {
    const record = await prisma.sharedLocation.findUnique({ where: { slug } });
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      lat: record.lat,
      lon: record.lon,
      label: record.label,
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch shared location by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
