import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  // Build date range filter
  let dateFilter = {};
  if (date) {
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    dateFilter = { gte: start, lte: end };
  }

  const [points, placeVisits, activitySegments] = await Promise.all([
    prisma.timelinePoint.findMany({
      where: date ? { timestamp: dateFilter } : undefined,
      orderBy: { timestamp: "asc" },
      select: {
        latitude: true,
        longitude: true,
        altitude: true,
        timestamp: true,
        activityType: true,
      },
    }),
    prisma.placeVisit.findMany({
      where: date ? { startTimestamp: dateFilter } : undefined,
      orderBy: { startTimestamp: "asc" },
    }),
    prisma.activitySegment.findMany({
      where: date ? { startTimestamp: dateFilter } : undefined,
      orderBy: { startTimestamp: "asc" },
    }),
  ]);

  // Serialize BigInt values and parse waypoints
  const serializedVisits = placeVisits.map((pv) => ({
    ...pv,
    startMs: Number(pv.startMs),
    endMs: Number(pv.endMs),
  }));

  const serializedSegments = activitySegments.map((seg) => ({
    ...seg,
    startMs: Number(seg.startMs),
    endMs: Number(seg.endMs),
    waypoints: seg.waypoints ? JSON.parse(seg.waypoints) : [],
  }));

  const serializedPoints = points.map((pt) => ({
    lat: pt.latitude,
    lon: pt.longitude,
    altitude: pt.altitude,
    timestamp: pt.timestamp.toISOString(),
    activityType: pt.activityType,
  }));

  return NextResponse.json({
    points: serializedPoints,
    placeVisits: serializedVisits,
    activitySegments: serializedSegments,
    totalPoints: serializedPoints.length,
  });
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline data' }, { status: 500 })
  }
}
