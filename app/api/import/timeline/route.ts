import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface PathPoint {
  lat: number;
  lon: number;
  altitude: number | null;
  timestamp: string;
  timestampMs: number;
  accuracy: number | null;
  activityType: string | null;
}

interface PlaceVisitInput {
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  startTimestamp: string;
  endTimestamp: string;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  confidence: string;
}

interface ActivitySegmentInput {
  activityType: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startTimestamp: string;
  endTimestamp: string;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  distanceMeters: number | null;
  waypoints: { lat: number; lon: number }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, semantic, clearExisting } = body as {
      path?: { points: PathPoint[] };
      semantic?: {
        placeVisits: PlaceVisitInput[];
        activitySegments: ActivitySegmentInput[];
      };
      clearExisting?: boolean;
    };

    // Optionally clear existing timeline data before import
    if (clearExisting) {
      await prisma.$transaction([
        prisma.timelinePoint.deleteMany(),
        prisma.placeVisit.deleteMany(),
        prisma.activitySegment.deleteMany(),
      ]);
    }

    let pointsImported = 0;
    let visitsImported = 0;
    let segmentsImported = 0;

    // Import path points in batches
    if (path?.points?.length) {
      const batchSize = 500;
      for (let i = 0; i < path.points.length; i += batchSize) {
        const batch = path.points.slice(i, i + batchSize);
        await prisma.timelinePoint.createMany({
          data: batch.map((pt) => ({
            latitude: pt.lat,
            longitude: pt.lon,
            altitude: pt.altitude,
            timestamp: new Date(pt.timestamp),
            timestampMs: BigInt(pt.timestampMs),
            accuracy: pt.accuracy,
            activityType: pt.activityType,
          })),
        });
        pointsImported += batch.length;
      }
    }

    // Import place visits
    if (semantic?.placeVisits?.length) {
      await prisma.placeVisit.createMany({
        data: semantic.placeVisits.map((pv) => ({
          name: pv.name,
          address: pv.address,
          latitude: pv.lat,
          longitude: pv.lon,
          startTimestamp: new Date(pv.startTimestamp),
          endTimestamp: new Date(pv.endTimestamp),
          startMs: BigInt(pv.startMs),
          endMs: BigInt(pv.endMs),
          durationMinutes: pv.durationMinutes,
          confidence: pv.confidence,
        })),
      });
      visitsImported = semantic.placeVisits.length;
    }

    // Import activity segments
    if (semantic?.activitySegments?.length) {
      await prisma.activitySegment.createMany({
        data: semantic.activitySegments.map((seg) => ({
          activityType: seg.activityType,
          startLat: seg.startLat,
          startLon: seg.startLon,
          endLat: seg.endLat,
          endLon: seg.endLon,
          startTimestamp: new Date(seg.startTimestamp),
          endTimestamp: new Date(seg.endTimestamp),
          startMs: BigInt(seg.startMs),
          endMs: BigInt(seg.endMs),
          durationMinutes: seg.durationMinutes,
          distanceMeters: seg.distanceMeters,
          waypoints: JSON.stringify(seg.waypoints),
        })),
      });
      segmentsImported = semantic.activitySegments.length;
    }

    return NextResponse.json({
      pointsImported,
      visitsImported,
      segmentsImported,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
