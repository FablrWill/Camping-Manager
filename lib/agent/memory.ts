import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { MemoryArraySchema } from '@/lib/parse-claude';

export const SLIDING_WINDOW_SIZE = 20;

/** Key used to store the AI-generated rolling summary row in AgentMemory */
const SUMMARY_KEY = '__summary__';

/**
 * Build a compact memory context string (< 500 tokens) for injection into the system prompt.
 * Returns the stored summary if available, otherwise falls back to raw key-value pairs.
 * This is injected at the start of every chat turn.
 */
export async function buildMemorySummary(): Promise<string> {
  const memories = await prisma.agentMemory.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  if (memories.length === 0) return '';

  // Use stored summary if available
  const summaryRow = memories.find((m) => m.key === SUMMARY_KEY);
  if (summaryRow?.summary) {
    return `WHAT I KNOW ABOUT YOU:\n${summaryRow.summary}`;
  }

  // Fallback: render raw pairs (excluding the summary meta-row)
  const pairs = memories
    .filter((m) => m.key !== SUMMARY_KEY)
    .map((m) => `- ${m.key}: ${m.value}`)
    .join('\n');

  return pairs ? `WHAT I KNOW ABOUT YOU:\n${pairs}` : '';
}

/**
 * Refresh the stored memory summary using a lightweight Haiku call.
 * Condenses all current key-value pairs into a single paragraph < 500 tokens.
 * Called by the background refresh job and after significant memory updates.
 * Fire-and-forget safe — never throws.
 */
export async function refreshMemorySummary(): Promise<void> {
  try {
    const memories = await prisma.agentMemory.findMany({
      where: { key: { not: SUMMARY_KEY } },
      orderBy: { updatedAt: 'desc' },
    });

    if (memories.length === 0) return;

    const pairs = memories.map((m) => `${m.key}: ${m.value}`).join('\n');

    const haiku = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await haiku.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Condense these user memory entries into a single concise paragraph under 400 tokens. Preserve all specific facts (dietary needs, preferences, companions, gear, regions). Write in second person ("You prefer...", "You don't eat..."). Return only the paragraph, no markdown.

${pairs}`,
        },
      ],
    });

    const summary =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

    if (!summary) return;

    await prisma.agentMemory.upsert({
      where: { key: SUMMARY_KEY },
      update: { value: 'summary', summary },
      create: { key: SUMMARY_KEY, value: 'summary', summary },
    });
  } catch (err) {
    console.error('Memory summary refresh failed:', err);
  }
}

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

  // Load compact memory summary (< 500 tokens)
  const memorySummary = await buildMemorySummary();
  const memoryBlock = memorySummary ? `\n\n${memorySummary}` : '';

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
