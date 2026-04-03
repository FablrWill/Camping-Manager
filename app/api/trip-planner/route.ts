import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool'
import { TRIP_PLANNER_TOOLS, executeTripPlannerTool } from '@/lib/agent/tools/trip-planner-tools'
import { TRIP_PLANNER_SYSTEM_PROMPT } from '@/lib/agent/trip-planner-system-prompt'
import { buildContextWindow } from '@/lib/agent/memory'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Wrap plain Tool schema objects with run() and parse() so BetaToolRunner can auto-execute them
function makeRunnableTools(): BetaRunnableTool<Record<string, unknown>>[] {
  return TRIP_PLANNER_TOOLS.map((tool) => ({
    ...tool,
    // parse: JSON-decode the raw input (BetaToolRunner passes it as parsed already, but required by type)
    parse: (content: unknown): Record<string, unknown> => {
      if (typeof content === 'string') {
        try { return JSON.parse(content) } catch { return {} }
      }
      return (content as Record<string, unknown>) ?? {}
    },
    // run: dispatch to the appropriate executor
    run: async (input: Record<string, unknown>): Promise<string> => {
      return executeTripPlannerTool(tool.name, input)
    },
  }))
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      conversationId: string | null
      userMessage: string
      pageContext?: string
    }

    const { conversationId, userMessage, pageContext } = body

    if (!userMessage?.trim()) {
      return Response.json({ error: 'userMessage is required' }, { status: 400 })
    }

    // Create or reuse conversation
    let activeConversationId: string
    if (!conversationId) {
      const conv = await prisma.conversation.create({
        data: { title: userMessage.slice(0, 100) },
      })
      activeConversationId = conv.id
    } else {
      const existing = await prisma.conversation.findUnique({ where: { id: conversationId } })
      if (existing) {
        activeConversationId = conversationId
      } else {
        const conv = await prisma.conversation.create({
          data: { title: userMessage.slice(0, 100) },
        })
        activeConversationId = conv.id
      }
    }

    // Build context window BEFORE saving user message (avoids duplicate in history)
    const contextMessages = await buildContextWindow(activeConversationId, pageContext)

    // Append new user message to context
    contextMessages.push({ role: 'user', content: userMessage })

    // Persist user message to DB
    await prisma.message.create({
      data: {
        conversationId: activeConversationId,
        role: 'user',
        content: userMessage,
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown): void => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          let fullAssistantText = ''

          const runnableTools = makeRunnableTools()

          // BetaToolRunner with SDK-native max_iterations cap
          const runner = client.beta.messages.toolRunner({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: TRIP_PLANNER_SYSTEM_PROMPT,
            tools: runnableTools,
            messages: contextMessages,
            stream: true,
            max_iterations: 8,
          })

          // Iterate over turns — each turn is a BetaMessageStream when stream: true
          for await (const turn of runner) {
            turn.on('text', (delta: string) => {
              fullAssistantText += delta
              send('text_delta', { delta })
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            turn.on('contentBlock', (block: any) => {
              if (block.type === 'tool_use' && block.name) {
                send('tool_activity', { toolName: block.name })
              }
            })

            // Wait for this turn to complete before processing the next
            await turn.finalMessage()
          }

          // Persist assistant response
          if (fullAssistantText) {
            await prisma.message.create({
              data: {
                conversationId: activeConversationId,
                role: 'assistant',
                content: fullAssistantText,
              },
            })
          }

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: activeConversationId },
            data: { updatedAt: new Date() },
          })

          // No memory extraction — trip planner conversations are focused and ephemeral
          send('message_complete', { conversationId: activeConversationId })
          controller.close()
        } catch (err) {
          console.error('Trip planner stream error:', err)
          send('stream_error', { message: 'Something went wrong. Try sending again.' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Trip planner route error:', err)
    return Response.json({ error: 'Failed to start trip planner stream' }, { status: 500 })
  }
}
