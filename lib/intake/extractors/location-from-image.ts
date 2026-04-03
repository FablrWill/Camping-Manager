import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import { parseClaudeJSON, LocationDraftSchema } from '@/lib/parse-claude';
import type { LocationDraft } from '@/lib/parse-claude';
import { extractGps } from '@/lib/exif';

const anthropic = new Anthropic();

export async function extractLocationFromImage(imagePath: string): Promise<{ draft: LocationDraft; summary: string; confidence: string }> {
  // Try EXIF first
  let lat: number | null = null;
  let lon: number | null = null;
  try {
    const buffer = fs.readFileSync(imagePath);
    const exif = extractGps(buffer);
    if (exif?.latitude && exif?.longitude) {
      lat = exif.latitude;
      lon = exif.longitude;
    }
  } catch {
    // EXIF extraction failure is non-fatal
  }

  // Claude Vision to identify location
  let imageData = '';
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  try {
    const buffer = fs.readFileSync(imagePath);
    imageData = buffer.toString('base64');
    if (imagePath.endsWith('.png')) mediaType = 'image/png';
    else if (imagePath.endsWith('.webp')) mediaType = 'image/webp';
  } catch {
    return {
      draft: { name: 'Unknown Location', latitude: lat, longitude: lon },
      summary: 'Could not read image',
      confidence: 'low',
    };
  }

  const prompt = `You are analyzing a photo of a campsite, trailhead, overlook, or outdoor location.
Extract location information and return a JSON object with these fields:
- name: descriptive name for this location (string, required, e.g. "Mountain overlook" or "Pine forest campsite")
- description: brief description of what you see (string or null, max 200 chars)
- type: one of: dispersed, campground, overlook, water_access, trailhead, other (string or null)
- notes: any notable features, hazards, or tips visible (string or null)
- latitude: null (we will use EXIF if available)
- longitude: null (we will use EXIF if available)

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
    const result = parseClaudeJSON(raw, LocationDraftSchema);

    if (result.success) {
      const draft: LocationDraft = {
        ...result.data,
        latitude: lat ?? result.data.latitude ?? null,
        longitude: lon ?? result.data.longitude ?? null,
      };
      return {
        draft,
        summary: draft.name,
        confidence: lat !== null ? 'high' : 'medium',
      };
    }
  } catch (err) {
    console.error('extractLocationFromImage Claude error:', err);
  }

  return {
    draft: { name: 'Unknown Location', latitude: lat, longitude: lon },
    summary: 'Photo of outdoor location',
    confidence: lat !== null ? 'medium' : 'low',
  };
}
