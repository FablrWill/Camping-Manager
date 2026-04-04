/**
 * deal-check.ts — Job handler for deal monitoring.
 *
 * Queries gear items with a target price set, estimates current market price
 * via Claude Haiku, and flags items within 10% of their target.
 */

import { prisma } from '@/lib/db';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export interface DealCheckPayload {
  // No input needed — queries DB directly
}

export interface DealCheckItem {
  gearItemId: string;
  name: string;
  targetPrice: number;
  estimatedPrice: number;
  isNearTarget: boolean;
}

export interface DealCheckResult {
  items: DealCheckItem[];
  checkedAt: string;
}

async function callHaiku(prompt: string, maxTokens = 1500): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text?: string }> };
  const textBlock = data.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

export async function processDealCheck(_payload: DealCheckPayload): Promise<DealCheckResult> {
  const gearWithTargetPrice = await prisma.gearItem.findMany({
    where: { targetPrice: { not: null } },
    select: { id: true, name: true, category: true, targetPrice: true },
  });

  if (gearWithTargetPrice.length === 0) {
    return { items: [], checkedAt: new Date().toISOString() };
  }

  // Chunk into batches of 10 to avoid overly long prompts
  const BATCH_SIZE = 10;
  const results: DealCheckItem[] = [];

  for (let i = 0; i < gearWithTargetPrice.length; i += BATCH_SIZE) {
    const batch = gearWithTargetPrice.slice(i, i + BATCH_SIZE);
    const itemList = batch.map((g) =>
      `- id: "${g.id}", name: "${g.name}", category: "${g.category}", targetPrice: ${g.targetPrice}`
    ).join('\n');

    const prompt = `You are a camping gear pricing expert. For each item below, estimate the current typical retail market price in USD.

Items:
${itemList}

Return ONLY valid JSON array (no markdown, no explanation):
[
  { "id": "item-id", "estimatedPrice": 49.99 },
  ...
]

Rules:
- Return one object per item in the same order
- estimatedPrice must be a number (USD)
- Use typical current retail pricing, not sale or used prices
- If you have no information about an item, estimate based on similar products in the category`;

    const text = await callHaiku(prompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Array<{ id: string; estimatedPrice: number }>;

    for (const item of batch) {
      const priceData = parsed.find((p) => p.id === item.id);
      const estimatedPrice = priceData?.estimatedPrice ?? 0;
      const targetPrice = item.targetPrice!;
      const isNearTarget = estimatedPrice > 0 && estimatedPrice <= targetPrice * 1.1;

      results.push({
        gearItemId: item.id,
        name: item.name,
        targetPrice,
        estimatedPrice,
        isNearTarget,
      });
    }
  }

  return { items: results, checkedAt: new Date().toISOString() };
}
