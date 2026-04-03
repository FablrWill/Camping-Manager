import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { upsertSharedLocation, deleteSharedLocation } from '@/lib/share-location';

/**
 * GET /api/share/location
 * Returns the current SharedLocation record (or null) for the app's own UI.
 * No auth needed — this endpoint is only accessible within the Tailscale network.
 */
export async function GET() {
  try {
    const record = await prisma.sharedLocation.findFirst();
    if (!record) return NextResponse.json(null);
    return NextResponse.json({
      id: record.id,
      slug: record.slug,
      lat: record.lat,
      lon: record.lon,
      label: record.label,
      updatedAt: record.updatedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch shared location:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

/**
 * POST /api/share/location
 * Creates or updates the shared location (upsert — singleton row).
 * Body: { lat: number, lon: number, label?: string | null }
 * Returns: { slug: string, url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lat = typeof body.lat === 'number' ? body.lat : parseFloat(body.lat);
    const lon = typeof body.lon === 'number' ? body.lon : parseFloat(body.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'lat and lon are required numbers' },
        { status: 400 }
      );
    }
    const label: string | null =
      typeof body.label === 'string' ? body.label.trim() || null : null;

    const record = await upsertSharedLocation(prisma, { lat, lon, label });
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    return NextResponse.json(
      { slug: record.slug, url: `${base}/share/${record.slug}` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to upsert shared location:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

/**
 * DELETE /api/share/location
 * Removes the shared location row. Idempotent — returns { deleted: boolean }.
 */
export async function DELETE() {
  try {
    const result = await deleteSharedLocation(prisma);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to delete shared location:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
