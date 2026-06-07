import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PSQL   = '/opt/homebrew/opt/postgresql@16/bin/psql';
const PG_URL = 'postgresql://lisaos_user@localhost/lisaos';

interface ServiceStatus {
  label: string;
  name: string;
  pid: number | null;
  lastExit: number;
  status: 'running' | 'stopped' | 'failed';
}

const SERVICE_LABELS: Record<string, string> = {
  'com.lisaos.inbox-watcher':   'Inbox Watcher',
  'com.lisaos.voice-connector': 'Voice Connector',
  'com.lisaos.hermes':          'Hermes',
  'com.lisaos.facet-summary':   'Facet Summary',
  'com.lisaos.voice-capture':   'Voice Capture',
  'com.lisaos.task-nightly':    'Nightly Task',
  'com.lisaos.task-digest':     'Daily Digest',
  'com.lisa.outland-pm2':       'Outland PM2',
  'com.lisaos.claude-session':  'Claude Session',
  'com.lisaos.orphan-cleanup':  'Orphan Cleanup',
};

function classifyStatus(pid: string, lastExit: number): ServiceStatus['status'] {
  if (pid !== '-') return 'running';
  if (lastExit !== 0) return 'failed';
  return 'stopped';
}

async function getServices(): Promise<ServiceStatus[]> {
  const seen = new Set<string>();
  const results: ServiceStatus[] = [];
  try {
    const { stdout } = await execAsync('launchctl list');
    // Output: PID\tLastExitStatus\tLabel (tab-separated, first line is header)
    const lines = stdout.trim().split('\n').slice(1);
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [pid, lastExitStr, label] = parts;
      if (!label) continue;
      if (!label.startsWith('com.lisaos.') && label !== 'com.lisa.outland-pm2') continue;
      seen.add(label);
      const lastExit = parseInt(lastExitStr ?? '0', 10);
      const safeExit = isNaN(lastExit) ? 0 : lastExit;
      results.push({
        label,
        name: SERVICE_LABELS[label] ?? label,
        pid: pid === '-' ? null : parseInt(pid, 10),
        lastExit: safeExit,
        status: classifyStatus(pid, safeExit),
      });
    }
  } catch {
    // launchctl unavailable — fill from known list below
  }
  // Ensure all known services appear even if absent from launchctl output
  for (const [label, name] of Object.entries(SERVICE_LABELS)) {
    if (!seen.has(label)) {
      results.push({ label, name, pid: null, lastExit: -1, status: 'failed' });
    }
  }
  // Sort: running first, then failed, then stopped
  const order: Record<string, number> = { running: 0, failed: 1, stopped: 2 };
  results.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.label.localeCompare(b.label));
  return results;
}

// Simple CSV row parser — fields may be double-quoted; no embedded commas in our data
function parseCSVRow(line: string): string[] {
  return line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
}

async function getMemoryStats() {
  const bySourceSQL =
    `SELECT source, COUNT(*)::int AS total, ` +
    `extract(epoch from MAX(created_at))::bigint AS last_activity, ` +
    `COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS today ` +
    `FROM memories GROUP BY source ORDER BY total DESC`;
  // NOTE: iMessage rows (176,885) were bulk-deleted 2026-06-07 -- they clogged the HNSW
  // index and are redundant with chat.db. This filter guards against re-inflation if
  // imessage ingestion is ever re-enabled; raw messages still live in ~/Library/Messages/chat.db.
  const totalSQL =
    `SELECT COUNT(*)::int AS total, ` +
    `COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS today ` +
    `FROM memories WHERE source != 'imessage'`;
  try {
    const [bySourceRes, totalRes] = await Promise.all([
      execAsync(`${PSQL} "${PG_URL}" --csv -c "${bySourceSQL}"`),
      execAsync(`${PSQL} "${PG_URL}" --csv -c "${totalSQL}"`),
    ]);
    const parseTable = (csv: string) => {
      const lines = csv.trim().split('\n');
      if (lines.length < 2) return [];
      const headers = parseCSVRow(lines[0]);
      return lines.slice(1).map(line => {
        const vals = parseCSVRow(line);
        const row: Record<string, string | number | null> = {};
        headers.forEach((h, i) => {
          const v = vals[i] ?? '';
          row[h] = v === '' ? null : (isNaN(Number(v)) ? v : Number(v));
        });
        return row;
      });
    };
    const bySource = parseTable(bySourceRes.stdout);
    const totalsRow = parseTable(totalRes.stdout)[0] ?? {};
    return {
      total: Number(totalsRow.total ?? 0),
      today: Number(totalsRow.today ?? 0),
      bySource,
    };
  } catch {
    return { total: 0, today: 0, bySource: [] };
  }
}

async function getGeminiUsage() {
  const today = new Date().toISOString().slice(0, 10);   // "YYYY-MM-DD" UTC
  const limit = 1_500;
  const sql =
    `SELECT COALESCE(request_count, 0) AS count FROM api_usage ` +
    `WHERE service = 'gemini' AND date = '${today}'`;
  try {
    const { stdout } = await execAsync(`${PSQL} "${PG_URL}" --csv -t -c "${sql}"`);
    const count = parseInt(stdout.trim() || '0', 10);
    return {
      count,
      limit,
      pct: Math.round((count / limit) * 100),
    };
  } catch {
    return { count: 0, limit, pct: 0 };
  }
}

async function getDisk() {
  try {
    // macOS df -h columns: Filesystem Size Used Avail Capacity iused ifree %iused Mounted
    const { stdout } = await execAsync(
      `df -h /Users/lisa | awk 'NR==2 {print $2 "," $3 "," $4 "," $5}'`
    );
    const [total, used, available, capacity] = stdout.trim().split(',');
    return { total, used, available, capacity };
  } catch {
    return null;
  }
}

export async function GET() {
  const [services, memories, gemini, disk] = await Promise.all([
    getServices(),
    getMemoryStats(),
    getGeminiUsage(),
    getDisk(),
  ]);
  return NextResponse.json(
    { timestamp: new Date().toISOString(), services, memories, gemini, disk },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
