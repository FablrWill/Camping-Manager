import { prisma } from '@/lib/db'
import GearClient from '@/components/GearClient'

export const metadata = {
  title: 'Gear — Outland OS',
}

export default async function GearPage() {
  const now = new Date()

  const [items, overdueItems] = await Promise.all([
    prisma.gearItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { priceCheck: true },
    }),
    // Count items where maintenance is overdue
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM "GearItem"
      WHERE "maintenanceIntervalDays" IS NOT NULL
        AND "lastMaintenanceAt" IS NOT NULL
        AND datetime("lastMaintenanceAt", '+' || "maintenanceIntervalDays" || ' days') < datetime(${now.toISOString()})
    `,
  ])

  const overdueMaintenanceCount = Number(overdueItems[0]?.count ?? 0)

  // Serialize dates to strings for the client component
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    researchedAt: item.researchedAt?.toISOString() ?? null,
    lastMaintenanceAt: item.lastMaintenanceAt?.toISOString() ?? null,
    priceCheck: item.priceCheck
      ? {
          ...item.priceCheck,
          checkedAt: item.priceCheck.checkedAt.toISOString(),
          createdAt: item.priceCheck.createdAt.toISOString(),
          updatedAt: item.priceCheck.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <GearClient
      initialItems={serialized}
      overdueMaintenanceCount={overdueMaintenanceCount}
    />
  )
}
