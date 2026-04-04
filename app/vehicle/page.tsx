export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/db";
import VehicleClient from "@/components/VehicleClient";

export default async function VehiclePage() {
  const vehicle = await prisma.vehicle.findFirst({
    include: { mods: { orderBy: { installedAt: "desc" } } },
  });

  if (!vehicle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🚙</p>
          <p className="text-lg font-medium text-stone-400 dark:text-stone-500">
            No vehicle set up yet
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            Add your vehicle in the database to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <VehicleClient
      vehicle={{
        ...vehicle,
        mods: vehicle.mods.map((m) => ({
          ...m,
          installedAt: m.installedAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
      }}
    />
  );
}
