export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import ChatClient from '@/components/ChatClient'

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ context?: string }> }) {
  const { context } = await searchParams

  let initialMessages: Array<{ id: string; role: string; content: string }> = []
  let conversationId: string | null = null

  // If no context param, resume most recent conversation
  if (!context) {
    const lastConversation = await prisma.conversation.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    })

    if (lastConversation) {
      conversationId = lastConversation.id
      initialMessages = lastConversation.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))
    }
  }

  // Parse context param into human-readable string
  let pageContext: string | undefined
  if (context) {
    // Format: "trip:clxyz123" or "gear:cla456" or "spot:clb789"
    const [type, id] = context.split(':')
    if (type === 'trip' && id) {
      const trip = await prisma.trip.findUnique({ where: { id }, select: { name: true } })
      pageContext = trip ? `User is viewing Trip: ${trip.name}` : undefined
    } else if (type === 'gear' && id) {
      const gear = await prisma.gearItem.findUnique({ where: { id }, select: { name: true } })
      pageContext = gear ? `User is viewing Gear: ${gear.name}` : undefined
    } else if (type === 'spot' && id) {
      const loc = await prisma.location.findUnique({ where: { id }, select: { name: true } })
      pageContext = loc ? `User is viewing Spot: ${loc.name}` : undefined
    }
  }

  return <ChatClient initialMessages={initialMessages} conversationId={conversationId} pageContext={pageContext} />
}
