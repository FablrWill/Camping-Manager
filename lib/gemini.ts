/**
 * Gemini API wrapper with daily quota tracking.
 *
 * Checks the `api_usage` table in the lisaos Postgres DB before every call and
 * increments the counter after each successful completion. When today's count
 * reaches QUOTA_LIMIT, throws GeminiQuotaError so callers can fall back
 * gracefully instead of burning the free-tier silently.
 *
 * Uses the same execAsync+psql pattern as /api/status/route.ts to avoid
 * adding a new DB dependency.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execAsync = promisify(exec);

const PSQL   = '/opt/homebrew/opt/postgresql@16/bin/psql';
const PG_URL = 'postgresql://lisaos_user@localhost/lisaos';

const SERVICE     = 'gemini';
const DAILY_LIMIT = 1_500;
const QUOTA_LIMIT = 1_400;  // 10 % buffer — stop before hitting the hard cap

// ── Public error ─────────────────────────────────────────────────────────────

export class GeminiQuotaError extends Error {
  readonly current: number;
  constructor(current: number) {
    super(
      `Gemini daily quota guard: ${current}/${DAILY_LIMIT} requests used today ` +
      `(limit set to ${QUOTA_LIMIT}). Skipping call to preserve free tier.`
    );
    this.name  = 'GeminiQuotaError';
    this.current = current;
  }
}

// ── Counter helpers ───────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);   // "YYYY-MM-DD" in UTC
}

/**
 * Return today's Gemini request count (0 if no row exists yet).
 */
export async function getGeminiUsageToday(): Promise<number> {
  const today = todayUTC();
  const sql =
    `SELECT request_count FROM api_usage ` +
    `WHERE service = '${SERVICE}' AND date = '${today}'`;
  try {
    const { stdout } = await execAsync(`${PSQL} "${PG_URL}" --csv -t -c "${sql}"`);
    const val = stdout.trim();
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Check quota then atomically increment. Returns new count.
 * Throws GeminiQuotaError if today's count is at or above QUOTA_LIMIT.
 */
async function checkAndIncrement(): Promise<number> {
  const current = await getGeminiUsageToday();

  if (current >= QUOTA_LIMIT) {
    throw new GeminiQuotaError(current);
  }

  const today = todayUTC();
  const sql =
    `INSERT INTO api_usage (service, date, request_count) VALUES ('${SERVICE}', '${today}', 1) ` +
    `ON CONFLICT (service, date) DO UPDATE SET request_count = api_usage.request_count + 1 ` +
    `RETURNING request_count`;
  const { stdout } = await execAsync(`${PSQL} "${PG_URL}" --csv -t -c "${sql}"`);
  return parseInt(stdout.trim(), 10);
}

// ── Lazy client ───────────────────────────────────────────────────────────────

let _gemini: GoogleGenAI | null = null;
function geminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return _gemini;
}

// ── Public call wrapper ───────────────────────────────────────────────────────

export interface GeminiCallOptions {
  systemInstruction?: string;
  maxOutputTokens?: number;
}

/**
 * Call Gemini, enforcing the daily quota guard.
 *
 * @throws {GeminiQuotaError} When the daily request count is at/above QUOTA_LIMIT.
 * @throws Any error from the Gemini SDK (network, auth, etc.).
 */
export async function callGemini(
  model: string,
  contents: string,
  options: GeminiCallOptions = {}
): Promise<string> {
  const newCount = await checkAndIncrement();   // throws GeminiQuotaError if over limit

  const config: Record<string, unknown> = {};
  if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
  if (options.maxOutputTokens)   config.maxOutputTokens   = options.maxOutputTokens;

  const response = await geminiClient().models.generateContent({
    model,
    contents,
    ...(Object.keys(config).length ? { config } : {}),
  });

  console.debug(`[gemini] call #${newCount} today — model=${model}`);
  return (response.text ?? '').trim();
}
