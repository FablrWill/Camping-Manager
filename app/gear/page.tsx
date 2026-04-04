import { prisma } from '@/lib/db'
import GearClient from '@/components/GearClient'

export const metadata = {
  title: 'Gear — Outland OS',
}

export default async function GearPage() {
  const [items, upgradeResearch] = await Promise.all([
    prisma.gearItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.gearResearch.findMany({
      where: { verdict: 'Worth upgrading' },
      include: {
        gearItem: { select: { id: true, name: true } },
      },
    }),
  ])

  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }))

  const upgrades = upgradeResearch.map((r) => {
    let topAlternativeName = 'Unknown'
    let reason = ''
    try {
      const parsed = JSON.parse(r.result) as {
        alternatives?: Array<{ name?: string; reason?: string }>
        summary?: string
      }
      topAlternativeName = parsed.alternatives?.[0]?.name ?? 'Unknown'
      reason = parsed.alternatives?.[0]?.reason ?? parsed.summary ?? ''
    } catch {
      // result is not valid JSON — leave defaults
    }
    return {
      gearItemId: r.gearItem.id,
      gearItemName: r.gearItem.name,
      topAlternativeName,
      reason,
      verdict: r.verdict,
    }
  })

  return <GearClient initialItems={serialized} initialUpgrades={upgrades} />
}
