import { prisma } from '@/lib/db'
import InboxClient from '@/components/InboxClient'

export default async function InboxPage() {
  const rows = await prisma.inboxItem.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Serialize dates for client component
  const items = rows.map((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    triageType: row.triageType,
    summary: row.summary,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
  }))

  return <InboxClient initialItems={items} />
}
