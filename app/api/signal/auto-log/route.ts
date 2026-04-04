import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** ±0.005 degrees ≈ ~500 m at mid-latitudes */
const PROXIMITY_THRESHOLD = 0.005;

interface AutoLogBody {
  latitude: number;
  longitude: number;
  carrier?: string;
  cellBars?: number;
  cellType?: string;
  signalStrength?: number;
  starlinkQuality?: string;
  speedDown?: number;
  speedUp?: number;
}

/**
 * POST /api/signal/auto-log
 *
 * Accepts signal data from the Home Assistant Companion app (or any client).
 * Finds the nearest saved Location within ~500 m; if none exists, creates a
 * new Location so the log always has a parent record.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as AutoLogBody;

    if (body.latitude == null || body.longitude == null) {
      return NextResponse.json(
        { error: 'latitude and longitude are required' },
        { status: 400 },
      );
    }

    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude must be numbers' },
        { status: 400 },
      );
    }

    // --- Find the nearest location within the proximity window ---
    const nearby = await prisma.location.findMany({
      where: {
        latitude: {
          gte: body.latitude - PROXIMITY_THRESHOLD,
          lte: body.latitude + PROXIMITY_THRESHOLD,
        },
        longitude: {
          gte: body.longitude - PROXIMITY_THRESHOLD,
          lte: body.longitude + PROXIMITY_THRESHOLD,
        },
      },
      select: { id: true, name: true, latitude: true, longitude: true },
    });

    let locationId: string;
    let locationName: string;
    let isNewLocation = false;

    if (nearby.length > 0) {
      // Pick the closest by Euclidean distance (fine at this scale)
      const closest = nearby.reduce((best, loc) => {
        const dLat = (loc.latitude ?? 0) - body.latitude;
        const dLon = (loc.longitude ?? 0) - body.longitude;
        const dist = dLat * dLat + dLon * dLon;

        const bLat = (best.latitude ?? 0) - body.latitude;
        const bLon = (best.longitude ?? 0) - body.longitude;
        const bestDist = bLat * bLat + bLon * bLon;

        return dist < bestDist ? loc : best;
      });

      locationId = closest.id;
      locationName = closest.name;
    } else {
      // No nearby location — create one automatically
      const lat = body.latitude.toFixed(4);
      const lon = body.longitude.toFixed(4);
      const newLocation = await prisma.location.create({
        data: {
          name: `Signal Log (${lat}, ${lon})`,
          latitude: body.latitude,
          longitude: body.longitude,
          type: 'dispersed',
        },
      });

      locationId = newLocation.id;
      locationName = newLocation.name;
      isNewLocation = true;
    }

    // --- Create the signal log entry ---
    await prisma.signalLog.create({
      data: {
        locationId,
        carrier: body.carrier ?? null,
        cellBars: body.cellBars ?? null,
        cellType: body.cellType ?? null,
        signalStrength: body.signalStrength ?? null,
        starlinkQuality: body.starlinkQuality ?? null,
        speedDown: body.speedDown ?? null,
        speedUp: body.speedUp ?? null,
      },
    });

    return NextResponse.json({
      logged: true,
      locationId,
      locationName,
      isNewLocation,
    });
  } catch (error: unknown) {
    console.error('Failed to auto-log signal:', error);
    return NextResponse.json(
      { error: 'Failed to log signal data' },
      { status: 500 },
    );
  }
}
