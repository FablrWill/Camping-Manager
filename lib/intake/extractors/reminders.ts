import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJSON, TextClassificationSchema } from '@/lib/parse-claude';
import type { TextClassification } from '@/lib/parse-claude';

const anthropic = new Anthropic();

/**
 * Classify terse voice-dictated Reminder text from the "Outland Inbox" Reminders list.
 * Reminders come from Siri dictation — they're short, imperative, and often vague.
 * The prompt tells Claude to infer camping intent liberally rather than defaulting to unknown.
 */
export async function classifyReminder(text: string): Promise<TextClassification> {
  const prompt = `You are classifying a camping-related note for a camping app. This note came from a voice Reminder — it may be terse, imperative, or missing context. Infer gear or location intent liberally rather than defaulting to unknown.

Classify this text and return a JSON object:
- triageType: one of "gear" (product to research or add to inventory), "location" (campsite, trail, or place), "knowledge" (general camping tip or article), "tip" (quick note or reminder), "unknown" (only if truly unrelated to camping)
- summary: one-line summary of the content (max 100 chars)
- confidence: "high", "medium", or "low"
- extractedData: object with relevant fields if triageType is "gear" (include name, category inferred from context) or "location" (include name)

Examples of terse Reminders and expected classification:
- "Look at MSR Whisperlite stove" → gear, medium confidence
- "Check out that campsite near Shining Rock" → location, medium confidence
- "Bear canister for Smokies trip" → gear, high confidence
- "Don't forget camp shoes" → gear, medium confidence

Text: """${text.slice(0, 500)}"""

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = parseClaudeJSON(raw, TextClassificationSchema);

    if (result.success) {
      return result.data;
    }
  } catch (err) {
    console.error('classifyReminder Claude error:', err);
  }

  return {
    triageType: 'tip',
    summary: text.slice(0, 100),
    confidence: 'low',
  };
}
