import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { MemoryArraySchema } from '@/lib/parse-claude';

export const SLIDING_WINDOW_SIZE = 20;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Assemble the messages array for an API call.
 * Injects agent memories and optional page context as a synthetic user/assistant exchange
 * to maintain the required alternating role structure without breaking the conversation flow.
 *
 * Implements D-14 sliding window: returns only the last SLIDING_WINDOW_SIZE messages
 * from conversation history to keep API costs bounded.
 */
export async function buildContextWindow(
  conversationId: string | null,
  pageContext?: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Load agent memories
  const memories = await prisma.agentMemory.findMany();
  const memoryBlock =
    memories.length > 0
      ? `\n\nWHAT I KNOW ABOUT YOU:\n${memories.map((m) => `- ${m.key}: ${m.value}`).join('\n')}`
      : '';

  const contextBlock = pageContext ? `\nCURRENT CONTEXT: ${pageContext}` : '';

  // Inject memory + context as synthetic exchange to maintain alternating roles
  if (memoryBlock || contextBlock) {
    messages.push(
      { role: 'user', content: `[System context]${memoryBlock}${contextBlock}` },
      { role: 'assistant', content: 'Got it.' }
    );
  }

  // Load recent conversation history if conversationId exists
  if (conversationId) {
    const recent = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: SLIDING_WINDOW_SIZE,
    });

    const historyMessages = recent
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    messages.push(...historyMessages);
  }

  return messages;
}

/**
 * Extract and save user preferences from a conversation exchange using a lightweight LLM call.
 * Runs fire-and-forget after each assistant response. Uses claude-haiku for low cost (~$0.001/call).
 *
 * Addresses review concern #1 (HIGH): Both Gemini and Claude flagged regex extraction as brittle.
 * LLM extraction handles natural language variability that regex cannot.
 */
export async function extractAndSaveMemory(assistantMessage: string, userMessage: string): Promise<void> {
  try {
    // Only attempt extraction if user message is substantive (>20 chars)
    if (userMessage.length < 20) return;

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Extract any user preferences or facts worth remembering from this message exchange. Return JSON array of {key, value} pairs. Keys should be snake_case categories like "dietary_needs", "camping_style", "gear_preferences", "camping_companions", "preferred_regions", "vehicle_info". Return [] if nothing worth remembering.

User said: "${userMessage}"
Assistant said: "${assistantMessage.slice(0, 500)}"

Return ONLY valid JSON array, no markdown fences.`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text || text.trim() === '[]') return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // LLM returned non-JSON — silently drop, memory is fire-and-forget
      return;
    }
    const validated = MemoryArraySchema.safeParse(parsed);
    if (!validated.success) return;
    const memories = validated.data;
    for (const { key, value } of memories) {
      if (key && value) {
        await prisma.agentMemory.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }
  } catch (err) {
    // Fire-and-forget: log but never throw — memory failures must not block chat responses
    console.error('Memory extraction failed:', err);
  }
}
