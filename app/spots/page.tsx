import { prisma } from "@/lib/db";
import SpotsClient from "./spots-client";

export default async function SpotsPage() {
  const [locations, photos] = await Promise.all([
    prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        type: true,
        rating: true,
        description: true,
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

  // Filter out null coords and cast
  const validLocations = locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      ...l,
      latitude: l.latitude as number,
      longitude: l.longitude as number,
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
