import { extractGearFromUrl } from './extractors/gear-from-url';
import { extractGearFromImage } from './extractors/gear-from-image';
import { extractLocationFromImage } from './extractors/location-from-image';
import { classifyText } from './extractors/classify-text';
import { classifyReminder } from './extractors/reminders';

export interface TriageInput {
  text?: string;
  url?: string;
  imagePath?: string;
  sourceHint?: 'reminder';
}

export interface TriageResult {
  sourceType: 'text' | 'url' | 'image';
  rawContent: string;
  triageType: string;
  suggestion: string; // JSON string
  summary: string;
  confidence: string;
  imagePath?: string;
}

export async function triageInput(input: TriageInput): Promise<TriageResult> {
  // Priority: image > url > text
  if (input.imagePath) {
    // Run both extractors and pick the better result
    const [gearResult, locationResult] = await Promise.all([
      extractGearFromImage(input.imagePath),
      extractLocationFromImage(input.imagePath),
    ]);

    // Prefer location when it has GPS coordinates (high confidence) or medium+ vs low gear
    const useLocation =
      locationResult.confidence === 'high' ||
      (locationResult.confidence === 'medium' && gearResult.confidence === 'low');

    if (useLocation) {
      return {
        sourceType: 'image',
        rawContent: input.imagePath,
        triageType: 'location',
        suggestion: JSON.stringify(locationResult.draft),
        summary: locationResult.summary,
        confidence: locationResult.confidence,
        imagePath: input.imagePath,
      };
    }

    return {
      sourceType: 'image',
      rawContent: input.imagePath,
      triageType: 'gear',
      suggestion: JSON.stringify(gearResult.draft),
      summary: gearResult.summary,
      confidence: gearResult.confidence,
      imagePath: input.imagePath,
    };
  }

  if (input.url) {
    const gearResult = await extractGearFromUrl(input.url);
    return {
      sourceType: 'url',
      rawContent: input.url,
      triageType: 'gear',
      suggestion: JSON.stringify(gearResult.draft),
      summary: gearResult.summary,
      confidence: gearResult.confidence,
    };
  }

  if (input.text) {
    const classification =
      input.sourceHint === 'reminder'
        ? await classifyReminder(input.text)
        : await classifyText(input.text);
    return {
      sourceType: 'text',
      rawContent: input.text,
      triageType: classification.triageType,
      suggestion: JSON.stringify(classification.extractedData ?? {}),
      summary: classification.summary,
      confidence: classification.confidence,
    };
  }

  return {
    sourceType: 'text',
    rawContent: '',
    triageType: 'unknown',
    suggestion: '{}',
    summary: 'Empty input',
    confidence: 'low',
  };
}
