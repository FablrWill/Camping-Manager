import { prisma } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export default async function Home() {
  const [gearCount, wishlistCount, locationCount, photoCount, vehicleMods, recentGear] =
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
    />
  );
}
