#!/usr/bin/env tsx
/**
 * scheduler.ts — PM2 scheduler for recurring AgentJob execution.
 *
 * On startup, seeds 4 recurring job templates if they don't exist.
 * Polls every 60 seconds for jobs whose scheduledFor <= now, creates
 * a pending execution job, and advances the template's scheduledFor
 * to the next occurrence.
 *
 * Usage:
 *   tsx scripts/scheduler.ts
 *
 * Environment:
 *   AGENT_BASE_URL — app URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.AGENT_BASE_URL || 'http://localhost:3000';

// ─── Simple cron parser ───────────────────────────────────────────────
// Only supports the two patterns used by this scheduler:
//   "0 H * * *"   — daily at hour H (UTC)
//   "0 H * * D"   — weekly on day-of-week D (0=Sun) at hour H (UTC)

function nextOccurrence(cron: string, after: Date): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) {
    throw new Error(`Unsupported cron expression: ${cron}`);
  }

  const hour = parseInt(parts[1], 10);
  const dowField = parts[4];
  const isWeekly = dowField !== '*';
  const targetDow = isWeekly ? parseInt(dowField, 10) : -1;

  const base = new Date(after);
  base.setUTCSeconds(0, 0);

  // Try candidates up to 8 days ahead
  for (let daysAhead = 0; daysAhead <= 8; daysAhead++) {
    const candidate = new Date(base);
    candidate.setUTCDate(base.getUTCDate() + daysAhead);
    candidate.setUTCHours(hour, 0, 0, 0);

    // Must be strictly after 'after'
    if (candidate <= after) continue;

    if (isWeekly && candidate.getUTCDay() !== targetDow) continue;

    return candidate;
  }

  // Fallback: 1 week from now
  const fallback = new Date(after);
  fallback.setUTCDate(fallback.getUTCDate() + 7);
  fallback.setUTCHours(hour, 0, 0, 0);
  return fallback;
}

// ─── Recurring job seeds ──────────────────────────────────────────────

interface RecurringJobSeed {
  type: string;
  recurringCron: string;
  scheduledFor: Date;
}

function buildSeeds(): RecurringJobSeed[] {
  const now = new Date();
  return [
    {
      type: 'deal_check',
      recurringCron: '0 8 * * *',
      scheduledFor: nextOccurrence('0 8 * * *', now),
    },
    {
      type: 'maintenance_due',
      recurringCron: '0 8 * * 0',
      scheduledFor: nextOccurrence('0 8 * * 0', now),
    },
    {
      type: 'trip_weather_alert',
      recurringCron: '0 7 * * *',
      scheduledFor: nextOccurrence('0 7 * * *', now),
    },
    {
      type: 'weekly_briefing',
      recurringCron: '0 9 * * 0',
      scheduledFor: nextOccurrence('0 9 * * 0', now),
    },
  ];
}

// ─── API helpers ──────────────────────────────────────────────────────

interface AgentJob {
  id: string;
  type: string;
  status: string;
  scheduledFor: string | null;
  recurringCron: string | null;
}

async function getJobsByType(type: string): Promise<AgentJob[]> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error(`GET /api/agent/jobs?type=${type} => ${res.status}`);
  return res.json() as Promise<AgentJob[]>;
}

async function createJob(data: {
  type: string;
  payload: string;
  triggeredBy: string;
  scheduledFor?: string;
  recurringCron?: string;
}): Promise<AgentJob> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /api/agent/jobs => ${res.status}: ${body}`);
  }
  return res.json() as Promise<AgentJob>;
}

async function patchJob(jobId: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(`[scheduler] PATCH /api/agent/jobs/${jobId} => ${res.status}`);
  }
}

async function getReadyJobs(): Promise<AgentJob[]> {
  const res = await fetch(`${BASE_URL}/api/agent/jobs?scheduled=ready`);
  if (!res.ok) throw new Error(`GET ?scheduled=ready => ${res.status}`);
  return res.json() as Promise<AgentJob[]>;
}

// ─── Seed recurring jobs on startup ──────────────────────────────────

async function seedRecurringJobs(): Promise<void> {
  const seeds = buildSeeds();
  for (const seed of seeds) {
    try {
      const existing = await getJobsByType(seed.type);
      const hasTemplate = existing.some((j) => j.recurringCron !== null);
      if (hasTemplate) {
        console.log(`[scheduler] Template already exists for ${seed.type}`);
        continue;
      }
      const job = await createJob({
        type: seed.type,
        payload: '{}',
        triggeredBy: 'schedule',
        scheduledFor: seed.scheduledFor.toISOString(),
        recurringCron: seed.recurringCron,
      });
      console.log(`[scheduler] Seeded ${seed.type} template job ${job.id}, next run: ${seed.scheduledFor.toISOString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Failed to seed ${seed.type}:`, message);
    }
  }
}

// ─── Poll loop ────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  try {
    const readyJobs = await getReadyJobs();
    if (readyJobs.length === 0) return;

    console.log(`[scheduler] ${readyJobs.length} job(s) due for execution`);

    for (const template of readyJobs) {
      try {
        // 1. Create a new pending execution job (no scheduledFor — picked up by agent-runner)
        const execJob = await createJob({
          type: template.type,
          payload: '{}',
          triggeredBy: 'schedule',
        });
        console.log(`[scheduler] Created execution job ${execJob.id} for ${template.type}`);

        // 2. Advance the template's scheduledFor to next occurrence
        if (template.recurringCron) {
          const nextRun = nextOccurrence(template.recurringCron, new Date());
          await patchJob(template.id, { scheduledFor: nextRun.toISOString() });
          console.log(`[scheduler] Advanced ${template.type} template to ${nextRun.toISOString()}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[scheduler] Failed to dispatch ${template.type}:`, message);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('ECONNREFUSED')) {
      console.error('[scheduler] Poll error:', message);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

console.log(`[scheduler] Starting — polling ${BASE_URL} every 60s`);

// Seed on startup, then poll immediately
seedRecurringJobs()
  .then(() => poll())
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[scheduler] Startup error:', message);
  });

setInterval(() => void poll(), 60_000);
