import { prisma } from "@/lib/db";
import TripsClient from "@/components/TripsClient";

export default async function TripsPage() {
  const [trips, locations, vehicles] = await Promise.all([
    prisma.trip.findMany({
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
        vehicle: { select: { id: true, name: true } },
        _count: { select: { packingItems: true, photos: true, alternatives: true } },
        packingItems: {
          select: {
            gearId: true,
            usageStatus: true,
            gear: { select: { name: true, category: true } },
          },
        },
        mealPlan: {
          select: {
            id: true,
            meals: { select: { id: true, name: true, slot: true, day: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      select: { id: true, name: true },
    }),
  ]);

  return (
    <TripsClient
      initialTrips={trips.map((t) => ({
        ...t,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        mealPlanGeneratedAt: t.mealPlanGeneratedAt?.toISOString() ?? null,
        reviewedAt: t.reviewedAt?.toISOString() ?? null,
        journalEntry: t.journalEntry ?? null,
        journalEntryAt: t.journalEntryAt?.toISOString() ?? null,
      }))}
      locations={locations}
      vehicles={vehicles}
    />
  );
}
