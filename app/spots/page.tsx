export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/db";
import SpotsClient from "./spots-client";

export default async function SpotsPage() {
  const [locations, photos] = await Promise.all([
    prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    }),
    prisma.photo.findMany({
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
    }),
  ]);

  // Filter out null coords, cast, and serialize dates
  const validLocations = locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      ...l,
      latitude: l.latitude as number,
      longitude: l.longitude as number,
      visitedAt: l.visitedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));

  const serializedPhotos = photos.map((p) => ({
    ...p,
    takenAt: p.takenAt?.toISOString() ?? null,
  }));

  return (
    <SpotsClient
      locations={validLocations}
      photos={serializedPhotos}
    />
  );
}
