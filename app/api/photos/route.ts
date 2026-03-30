import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const photos = await prisma.photo.findMany({
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      altitude: true,
      takenAt: true,
      imagePath: true,
      locationSource: true,
      locationDescription: true,
      locationConfidence: true,
      visionApproximate: true,
      googleUrl: true,
    },
    orderBy: { takenAt: "desc" },
  });

  const serialized = photos.map((p) => ({
    ...p,
    takenAt: p.takenAt?.toISOString() ?? null,
  }));

  return NextResponse.json(serialized);
}
