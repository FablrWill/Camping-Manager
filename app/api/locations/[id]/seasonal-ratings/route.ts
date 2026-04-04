import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ratings = await prisma.seasonalRating.findMany({
      where: { locationId: id },
      orderBy: { season: "asc" },
    });
    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Failed to fetch seasonal ratings:", error);
    return NextResponse.json({ error: "Failed to fetch seasonal ratings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { season, rating, notes } = body;

    const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
    if (!season || !VALID_SEASONS.includes(season)) {
      return NextResponse.json({ error: "season must be spring, summer, fall, or winter" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
    }

    const result = await prisma.seasonalRating.upsert({
      where: { locationId_season: { locationId: id, season } },
      create: { locationId: id, season, rating, notes: notes ?? null },
      update: { rating, notes: notes ?? null },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to upsert seasonal rating:", error);
    return NextResponse.json({ error: "Failed to save seasonal rating" }, { status: 500 });
  }
}
