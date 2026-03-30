import { prisma } from '@/lib/db'
import GearClient from '@/components/GearClient'

export const metadata = {
  title: 'Gear — Outland OS',
}

export default async function GearPage() {
  const items = await prisma.gearItem.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  // Serialize dates to strings for the client component
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }))

  return <GearClient initialItems={serialized} />
}
