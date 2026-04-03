import Anthropic from '@anthropic-ai/sdk';
import { parseClaudeJSON, TextClassificationSchema } from '@/lib/parse-claude';
import type { TextClassification } from '@/lib/parse-claude';

const anthropic = new Anthropic();

export async function classifyText(text: string): Promise<TextClassification> {
  const prompt = `You are classifying a camping-related note or tip for a camping app.
Classify this text and return a JSON object:
- triageType: one of "gear" (product to add to inventory), "location" (campsite/trail info), "knowledge" (general tip/article), "tip" (quick note), "unknown"
- summary: one-line summary of the content (max 100 chars)
- confidence: "high", "medium", or "low"
- extractedData: object with relevant fields if triageType is "gear" (include name, category) or "location" (include name)

Text: """${text.slice(0, 1000)}"""

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
    console.error('classifyText Claude error:', err);
  }

  return {
    triageType: 'unknown',
    summary: text.slice(0, 100),
    confidence: 'low',
  };
}
