import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseGpx } from '@/lib/gpx';
import { gpxToGeoJson } from '@/lib/gpx-to-geojson';
import type { FeatureCollection } from 'geojson';

// POST /api/import/gpx — import a GPX file
// Body: { gpx: string (XML content), createLocations?: boolean, filename?: string }
// Returns: { waypoints, tracks, locationsCreated, trailsCreated }
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

    // Create Trail record from track data (per D-04 and D-06)
    let trailsCreated = 0;
    const geojson = gpxToGeoJson(body.gpx);
    const trackFeatures = geojson.features.filter(
      (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
    );

    if (trackFeatures.length > 0) {
      const trackCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: trackFeatures,
      };
      const trailName = data.name ?? body.filename ?? 'Imported Trail';
      await prisma.trail.create({
        data: {
          name: trailName,
          geoJson: JSON.stringify(trackCollection),
          sourceFile: body.filename ?? null,
        },
      });
      trailsCreated++;
    }

    return NextResponse.json({
      name: data.name,
      waypoints: data.waypoints,
      tracks: data.tracks,
      locationsCreated,
      trailsCreated,
      summary: {
        waypointCount: data.waypoints.length,
        trackCount: data.tracks.length,
        totalTrackPoints: data.tracks.reduce((sum, t) => sum + t.points.length, 0),
        trailsCreated,
      },
    });
  } catch (error) {
    console.error('Failed to import GPX:', error);
    return NextResponse.json({ error: 'Failed to parse GPX file' }, { status: 500 });
  }
}
