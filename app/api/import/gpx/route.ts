import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseGpx } from '@/lib/gpx';

// POST /api/import/gpx — import a GPX file
// Body: { gpx: string (XML content), createLocations?: boolean }
// Returns: { waypoints, tracks, locationsCreated }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.gpx || typeof body.gpx !== 'string') {
      return NextResponse.json(
        { error: 'gpx (XML string) is required' },
        { status: 400 }
      );
    }

    const data = parseGpx(body.gpx);
    let locationsCreated = 0;

    // Optionally create Location records from waypoints
    if (body.createLocations !== false && data.waypoints.length > 0) {
      for (const wpt of data.waypoints) {
        if (!wpt.lat || !wpt.lon) continue;

        // Check for existing location at similar coordinates (within ~100m)
        const existing = await prisma.location.findFirst({
          where: {
            latitude: { gte: wpt.lat - 0.001, lte: wpt.lat + 0.001 },
            longitude: { gte: wpt.lon - 0.001, lte: wpt.lon + 0.001 },
          },
        });

        if (!existing) {
          await prisma.location.create({
            data: {
              name: wpt.name || `GPX Waypoint (${wpt.lat.toFixed(4)}, ${wpt.lon.toFixed(4)})`,
              latitude: wpt.lat,
              longitude: wpt.lon,
              description: wpt.description || null,
              notes: wpt.elevation ? `Elevation: ${Math.round(wpt.elevation)}m` : null,
              type: 'dispersed',
            },
          });
          locationsCreated++;
        }
      }
    }

    return NextResponse.json({
      name: data.name,
      waypoints: data.waypoints,
      tracks: data.tracks,
      locationsCreated,
      summary: {
        waypointCount: data.waypoints.length,
        trackCount: data.tracks.length,
        totalTrackPoints: data.tracks.reduce((sum, t) => sum + t.points.length, 0),
      },
    });
  } catch (error) {
    console.error('Failed to import GPX:', error);
    return NextResponse.json({ error: 'Failed to parse GPX file' }, { status: 500 });
  }
}
