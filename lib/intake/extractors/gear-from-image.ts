import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import { parseClaudeJSON, GearDraftSchema } from '@/lib/parse-claude';
import type { GearDraft } from '@/lib/parse-claude';

const anthropic = new Anthropic();

export async function extractGearFromImage(imagePath: string): Promise<{ draft: GearDraft; summary: string; confidence: string }> {
  let imageData: string;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';

  try {
    const buffer = fs.readFileSync(imagePath);
    imageData = buffer.toString('base64');
    if (imagePath.endsWith('.png')) mediaType = 'image/png';
    else if (imagePath.endsWith('.webp')) mediaType = 'image/webp';
  } catch {
    return {
      draft: { name: 'Unknown Item', isWishlist: true, category: 'tools' },
      summary: 'Could not read image',
      confidence: 'low',
    };
  }

  const prompt = `You are analyzing a photo of camping/outdoor gear or a product screenshot.
Extract product information and return a JSON object with these fields:
- name: product name (string, required)
- brand: brand name (string or null)
- category: one of: shelter, sleep, cook, hydration, clothing, lighting, tools, safety, furniture, power, electronics, vehicle, navigation, hiking, dog
- description: brief description (string or null, max 200 chars)
- price: numeric price if visible (number or null)
- purchaseUrl: URL if visible in screenshot (string or null)
- notes: any additional relevant notes (string or null)
- isWishlist: true (this is a wishlist item from intake)

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = parseClaudeJSON(raw, GearDraftSchema);

    if (result.success) {
      return {
        draft: { ...result.data, isWishlist: true },
        summary: `${result.data.name}${result.data.price ? ` — $${result.data.price}` : ''}`,
        confidence: 'medium',
      };
    }
  } catch (err) {
    console.error('extractGearFromImage Claude error:', err);
  }

  return {
    draft: { name: 'Unknown Item', isWishlist: true, category: 'tools' },
    summary: 'Image processed but could not extract gear info',
    confidence: 'low',
  };
}
