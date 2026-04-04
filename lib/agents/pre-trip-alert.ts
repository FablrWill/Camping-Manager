import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';

export interface PreTripAlertPayload {
  tripId: string;
  tripName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
}

export interface PreTripAlert {
  severity: 'warning' | 'info';
  title: string;
  body: string;
}

export interface PreTripAlertResult {
  alerts: PreTripAlert[];
  checkedAt: string;
}

const client = new Anthropic();

export async function runPreTripAlert(
  jobId: string,
  payload: PreTripAlertPayload
): Promise<void> {
  const prompt = `You are a knowledgeable outdoor safety assistant helping a car camper prepare for a trip.

TRIP DETAILS:
- Destination: ${payload.locationName}
- Coordinates: ${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)}
- Start date: ${payload.startDate}

Check for the following conditions and return a JSON array of alerts:

1. **Fire restrictions** — Is there an active fire ban, Stage 1 or Stage 2 fire restriction, or campfire prohibition in this region? Check based on the location's state/national forest/district.
2. **Weather window** — Based on typical/historical conditions for this region and date, summarize any notable weather risks (e.g., monsoon season, spring snow, extreme heat, freeze risk at night).
3. **Road/trail closures** — Are there any known seasonal road closures, permit requirements, or access restrictions for this area?

Return ONLY valid JSON (no markdown, no explanation):
{
  "alerts": [
    {
      "severity": "warning",
      "title": "Short title (max 60 chars)",
      "body": "Detailed explanation with actionable advice (1-2 sentences)"
    }
  ]
}

Rules:
- severity "warning" = something that requires action or may affect the trip significantly
- severity "info" = useful context that doesn't require action
- If no issues found for a category, omit it from the array
- If the location is vague or coordinates are imprecise, note that uncertainty in the body
- Include at least one entry (even if just a general season/conditions note)
- Maximum 5 alerts total`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : '';

    // Strip markdown fences if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { alerts: PreTripAlert[] };

    const result: PreTripAlertResult = {
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts.map((a) => ({
        severity: a.severity === 'warning' ? 'warning' : 'info',
        title: String(a.title ?? ''),
        body: String(a.body ?? ''),
      })) : [],
      checkedAt: new Date().toISOString(),
    };

    await prisma.agentJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        result: JSON.stringify(result),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pre-trip-alert] Job failed:', message);

    await prisma.agentJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        result: JSON.stringify({ error: message }),
        completedAt: new Date(),
      },
    });
  }
}
