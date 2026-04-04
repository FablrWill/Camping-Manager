import { prisma } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

type UpcomingTripQueryResult = Awaited<ReturnType<typeof fetchUpcomingTrip>>;

async function fetchUpcomingTrip() {
  return prisma.trip.findFirst({
    where: { startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      location: { select: { name: true } },
      mealPlan: {
        select: {
          generatedAt: true,
          shoppingListItems: {
            select: { id: true, checked: true },
          },
        },
      },
    },
  });
}

function getMealPlanStatus(trip: UpcomingTripQueryResult): string | null {
  if (!trip) return null;
  if (!trip.mealPlan) return 'No meal plan yet \u2014 tap to generate';
  const items = trip.mealPlan.shoppingListItems ?? [];
  if (items.length === 0) return 'Meal plan ready \u2014 shopping list pending';
  const unchecked = items.filter((i) => !i.checked).length;
  if (unchecked === 0) return 'All stocked up \u2014 ready to roll';
  return `Shopping list ready \u2014 ${unchecked} items to get`;
}

export default async function Home() {
  const [gearCount, wishlistCount, locationCount, photoCount, vehicleMods, recentGear, upcomingTrip] =
    await Promise.all([
      prisma.gearItem.count({ where: { isWishlist: false } }),
      prisma.gearItem.count({ where: { isWishlist: true } }),
      prisma.location.count(),
      prisma.photo.count(),
      prisma.vehicleMod.count(),
      prisma.gearItem.findMany({
        where: { isWishlist: false },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          brand: true,
          condition: true,
          updatedAt: true,
        },
      }),
      fetchUpcomingTrip(),
    ]);

  const totalWeight = await prisma.gearItem.aggregate({
    where: { isWishlist: false, weight: { not: null } },
    _sum: { weight: true },
  });

  return (
    <DashboardClient
      stats={{
        gearCount,
        wishlistCount,
        locationCount,
        photoCount,
        vehicleMods,
        totalWeight: totalWeight._sum.weight ?? 0,
      }}
      recentGear={recentGear.map((g) => ({
        ...g,
        updatedAt: g.updatedAt.toISOString(),
      }))}
      upcomingTrip={upcomingTrip ? {
        id: upcomingTrip.id,
        name: upcomingTrip.name,
        startDate: upcomingTrip.startDate.toISOString(),
        endDate: upcomingTrip.endDate.toISOString(),
        locationName: upcomingTrip.location?.name ?? null,
        mealPlanStatus: getMealPlanStatus(upcomingTrip),
      } : null}
    />
  );
}
