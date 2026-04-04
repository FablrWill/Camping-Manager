#!/usr/bin/env tsx
/**
 * agent-runner.ts — Mac mini background worker for the AgentJob queue.
 *
 * Polls the Outland OS API for pending jobs, processes them with Claude,
 * and posts results back. Run with PM2 or launchd on the Mac mini.
 *
 * Usage:
 *   tsx scripts/agent-runner.ts
 *
 * Environment:
 *   ANTHROPIC_API_KEY  — required
 *   AGENT_BASE_URL     — app URL (default: http://localhost:3000)
 *   AGENT_POLL_INTERVAL — seconds between polls (default: 30)
 */

const BASE_URL = process.env.AGENT_BASE_URL || 'http://localhost:3000';
const POLL_INTERVAL = Number(process.env.AGENT_POLL_INTERVAL || '30') * 1000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('[agent-runner] ANTHROPIC_API_KEY is required');
  process.exit(1);
}

// ─── Types ───────────────────────────────────────────────────────────

interface AgentJob {
  id: string;
  type: string;
  status: string;
  payload: string;
  result: string | null;
  createdAt: string;
}

interface GearEnrichmentPayload {
  gearItemId: string;
  name: string;
  category: string;
}

interface GearEnrichmentResult {
  brand: string | null;
  description: string | null;
  weight: number | null;
  notes: string | null;
}

interface PreTripAlertPayload {
  tripId: string;
  tripName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startDate: string;
}

interface PreTripAlert {
  severity: 'warning' | 'info';
  title: string;
  body: string;
}

interface PreTripAlertResult {
  alerts: PreTripAlert[];
  checkedAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────

async function fetchPendingJobs(): Promise<AgentJob[]> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs?status=pending`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pending jobs: ${res.status}`);
  }
  return res.json() as Promise<AgentJob[]>;
}

async function claimJob(jobId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'running' }),
  });
  return res.ok;
}

async function postResult(jobId: string, result: unknown): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/agent/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, result }),
  });
  return res.ok;
}

async function failJob(jobId: string, error: string): Promise<void> {
  await fetch(`${BASE_URL}/api/agent/jobs/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'failed' }),
  });
  // Also post the error as the result so it's visible in the dashboard
  await fetch(`${BASE_URL}/api/agent/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, result: { error } }),
  }).catch(() => { /* job already marked failed, result post is best-effort */ });
}

// ─── Claude call ─────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 1000): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
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

// ─── Job processors ──────────────────────────────────────────────────

async function processGearEnrichment(payload: GearEnrichmentPayload): Promise<GearEnrichmentResult> {
  const prompt = `You are a camping gear expert. Given this gear item, provide factual details.

GEAR: "${payload.name}" (category: ${payload.category})

Return ONLY valid JSON (no markdown code blocks):
{
  "brand": "manufacturer name or null if unknown",
  "description": "1-2 sentence description of what this item is and why a car camper would use it",
  "weight": null or weight in pounds as a number (e.g. 2.5),
  "notes": "any helpful tips about this specific product — setup, care, common complaints, or null"
}

Be factual. If you're not confident about a field, use null. Do not guess weights.`;

  const text = await callClaude(prompt);

  // Parse JSON from Claude's response (strip markdown fences if present)
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const result = JSON.parse(cleaned) as GearEnrichmentResult;

  return {
    brand: typeof result.brand === 'string' ? result.brand : null,
    description: typeof result.description === 'string' ? result.description : null,
    weight: typeof result.weight === 'number' ? result.weight : null,
    notes: typeof result.notes === 'string' ? result.notes : null,
  };
}

async function processPreTripAlert(payload: PreTripAlertPayload): Promise<PreTripAlertResult> {
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

  const text = await callClaude(prompt, 1024);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { alerts: PreTripAlert[] };

  return {
    alerts: Array.isArray(parsed.alerts)
      ? parsed.alerts.map((a) => ({
          severity: (a.severity === 'warning' ? 'warning' : 'info') as 'warning' | 'info',
          title: String(a.title ?? ''),
          body: String(a.body ?? ''),
        }))
      : [],
    checkedAt: new Date().toISOString(),
  };
}

// ─── Job dispatch ────────────────────────────────────────────────────

type JobProcessor = (payload: unknown) => Promise<unknown>;

const processors: Record<string, JobProcessor> = {
  gear_enrichment: (payload) => processGearEnrichment(payload as GearEnrichmentPayload),
  pre_trip_alert: (payload) => processPreTripAlert(payload as PreTripAlertPayload),
};

async function processJob(job: AgentJob): Promise<void> {
  const processor = processors[job.type];
  if (!processor) {
    console.warn(`[agent-runner] Unknown job type: ${job.type} — skipping`);
    await failJob(job.id, `Unknown job type: ${job.type}`);
    return;
  }

  console.log(`[agent-runner] Processing ${job.type} job ${job.id}`);

  const claimed = await claimJob(job.id);
  if (!claimed) {
    console.warn(`[agent-runner] Failed to claim job ${job.id} — skipping`);
    return;
  }

  try {
    const payload = JSON.parse(job.payload);
    const result = await processor(payload);
    const posted = await postResult(job.id, result);
    if (posted) {
      console.log(`[agent-runner] Completed ${job.type} job ${job.id}`);
    } else {
      console.error(`[agent-runner] Failed to post result for job ${job.id}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent-runner] Job ${job.id} failed:`, message);
    await failJob(job.id, message);
  }
}

// ─── Poll loop ───────────────────────────────────────────────────────

async function poll(): Promise<void> {
  try {
    const jobs = await fetchPendingJobs();
    if (jobs.length > 0) {
      console.log(`[agent-runner] Found ${jobs.length} pending job(s)`);
    }
    // Process sequentially to avoid hammering Claude API
    for (const job of jobs) {
      await processJob(job);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Don't crash on transient errors (app might be restarting)
    if (!message.includes('ECONNREFUSED')) {
      console.error('[agent-runner] Poll error:', message);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────

console.log(`[agent-runner] Starting — polling ${BASE_URL} every ${POLL_INTERVAL / 1000}s`);
console.log(`[agent-runner] Registered processors: ${Object.keys(processors).join(', ')}`);

// Initial poll immediately, then on interval
void poll();
setInterval(() => void poll(), POLL_INTERVAL);
