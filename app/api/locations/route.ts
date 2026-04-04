import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function deriveBestSeason(ratings: { season: string; rating: number }[]): string | null {
  if (!ratings.length) return null;
  const top = ratings.reduce((a, b) => (b.rating > a.rating ? b : a));
  if (top.rating < 4) return null;
  const tied = ratings.filter((r) => r.rating === top.rating);
  if (tied.length > 1) return null; // no clear winner
  return top.season;
}

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { updatedAt: "desc" },
      include: { seasonalRatings: true },
    });

    const serialized = locations.map((loc) => {
      // Derive best season: highest rating ≥ 4 that is uniquely the top score
      const bestSeason = deriveBestSeason(loc.seasonalRatings);
      return {
        ...loc,
        visitedAt: loc.visitedAt?.toISOString() ?? null,
        createdAt: loc.createdAt.toISOString(),
        updatedAt: loc.updatedAt.toISOString(),
        seasonalRatings: undefined, // don't leak full rows to client
        bestSeason,
      };
    });

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Failed to fetch locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        type: body.type ?? null,
        description: body.description ?? null,
        rating: body.rating ?? null,
        roadCondition: body.roadCondition ?? null,
        clearanceNeeded: body.clearanceNeeded ?? null,
        cellSignal: body.cellSignal ?? null,
        starlinkSignal: body.starlinkSignal ?? null,
        waterAccess: body.waterAccess ?? false,
        visitedAt: body.visitedAt ? new Date(body.visitedAt) : null,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Failed to create location:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}
