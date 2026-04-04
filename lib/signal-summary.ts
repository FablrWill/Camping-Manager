/**
 * Signal summary aggregation library.
 *
 * Computes per-location signal quality tiers from SignalLog records and
 * Location.cellSignal / Location.starlinkSignal summary strings.
 *
 * Tier definitions (from 39-CONTEXT.md decisions D-04 through D-07):
 *   green  — LTE or 5G with 3+ bars, OR Starlink strong/excellent
 *   yellow — any cell signal with 1–2 bars, OR Starlink moderate, OR LTE/5G with <3 bars
 *   red    — cellType "none" OR cellBars 0
 *   gray   — no signal logs AND no Location signal summary strings (unknown)
 */

export type SignalTier = 'green' | 'yellow' | 'red' | 'gray';

export interface SignalSummary {
  tier: SignalTier;
  bestCellType: string | null;
  bestCellBars: number | null;
  bestStarlinkQuality: string | null;
  readingCount: number;
}

interface SignalInput {
  cellBars: number | null | undefined;
  cellType: string | null | undefined;
  starlinkQuality: string | null | undefined;
}

const CELL_TYPE_RANK: Record<string, number> = {
  '5G': 4,
  'LTE': 3,
  '3G': 2,
  'none': 1,
};

const STARLINK_QUALITY_RANK: Record<string, number> = {
  'excellent': 5,
  'strong': 4,
  'moderate': 3,
  'weak': 2,
  'none': 1,
};

/**
 * Classify a single signal reading into a tier.
 * Priority: green > yellow > red > gray
 */
export function getSignalTier(input: SignalInput): SignalTier {
  const { cellBars, cellType, starlinkQuality } = input;

  const hasAnyData =
    cellBars != null ||
    (cellType != null && cellType !== '') ||
    (starlinkQuality != null && starlinkQuality !== '');

  if (!hasAnyData) {
    return 'gray';
  }

  // D-04: Green — LTE or 5G with 3+ bars, OR Starlink strong/excellent
  if (
    ((cellType === 'LTE' || cellType === '5G') && cellBars != null && cellBars >= 3) ||
    (starlinkQuality === 'strong' || starlinkQuality === 'excellent')
  ) {
    return 'green';
  }

  // D-06: Red — cellType "none" OR cellBars 0
  // Check red before yellow so cellBars=0 doesn't accidentally match yellow
  if (cellType === 'none' || (cellBars != null && cellBars === 0)) {
    return 'red';
  }

  // D-05: Yellow — 1-2 bars on any non-none cellType, OR Starlink moderate,
  // OR LTE/5G with <3 bars
  if (
    (cellBars != null && cellBars >= 1 && cellBars <= 2) ||
    starlinkQuality === 'moderate' ||
    ((cellType === 'LTE' || cellType === '5G') && cellBars != null && cellBars < 3)
  ) {
    return 'yellow';
  }

  return 'gray';
}

/**
 * Pick the best (greenest) tier from a set of tiers.
 */
function bestTier(tiers: SignalTier[]): SignalTier {
  const rank: Record<SignalTier, number> = { green: 4, yellow: 3, red: 2, gray: 1 };
  let best: SignalTier = 'gray';
  for (const t of tiers) {
    if (rank[t] > rank[best]) {
      best = t;
    }
  }
  return best;
}

/**
 * Aggregate signal logs + Location summary strings into a single SignalSummary.
 *
 * @param logs    Array of SignalLog-like objects for a single location.
 * @param cellSignalStr   Location.cellSignal string (e.g. "LTE 3 bars"), may be null.
 * @param starlinkSignalStr  Location.starlinkSignal string (e.g. "strong"), may be null.
 */
export function aggregateSignalSummaries(
  logs: SignalInput[],
  cellSignalStr: string | null | undefined,
  starlinkSignalStr: string | null | undefined
): SignalSummary {
  if (logs.length > 0) {
    const tiers = logs.map((log) => getSignalTier(log));
    const tier = bestTier(tiers);

    // Best cell type (5G > LTE > 3G > none)
    let bestCellType: string | null = null;
    let bestCellTypeRank = 0;
    for (const log of logs) {
      if (log.cellType) {
        const rank = CELL_TYPE_RANK[log.cellType] ?? 0;
        if (rank > bestCellTypeRank) {
          bestCellTypeRank = rank;
          bestCellType = log.cellType;
        }
      }
    }

    // Best cell bars (max)
    let bestCellBars: number | null = null;
    for (const log of logs) {
      if (log.cellBars != null) {
        if (bestCellBars === null || log.cellBars > bestCellBars) {
          bestCellBars = log.cellBars;
        }
      }
    }

    // Best starlink quality (excellent > strong > moderate > weak > none)
    let bestStarlinkQuality: string | null = null;
    let bestStarlinkRank = 0;
    for (const log of logs) {
      if (log.starlinkQuality) {
        const rank = STARLINK_QUALITY_RANK[log.starlinkQuality] ?? 0;
        if (rank > bestStarlinkRank) {
          bestStarlinkRank = rank;
          bestStarlinkQuality = log.starlinkQuality;
        }
      }
    }

    return {
      tier,
      bestCellType,
      bestCellBars,
      bestStarlinkQuality,
      readingCount: logs.length,
    };
  }

  // No logs — try to parse Location summary strings
  if (cellSignalStr || starlinkSignalStr) {
    let parsedCellType: string | null = null;
    let parsedCellBars: number | null = null;
    let parsedStarlinkQuality: string | null = null;

    if (cellSignalStr) {
      const typeMatch = cellSignalStr.match(/(5G|LTE|3G|none)/i);
      if (typeMatch) {
        parsedCellType = typeMatch[1].toUpperCase() === 'NONE' ? 'none' : typeMatch[1].toUpperCase();
        // Normalise LTE and 5G but keep 3G uppercase
        if (parsedCellType !== 'none') {
          parsedCellType = typeMatch[1]; // keep original casing (e.g. "LTE", "5G", "3G")
        }
      }
      const barsMatch = cellSignalStr.match(/(\d)\s*bar/i);
      if (barsMatch) {
        parsedCellBars = parseInt(barsMatch[1], 10);
      }
    }

    if (starlinkSignalStr) {
      const starlinkMatch = starlinkSignalStr.match(/(excellent|strong|moderate|weak|none)/i);
      if (starlinkMatch) {
        parsedStarlinkQuality = starlinkMatch[1].toLowerCase();
      }
    }

    const tier = getSignalTier({
      cellBars: parsedCellBars,
      cellType: parsedCellType,
      starlinkQuality: parsedStarlinkQuality,
    });

    return {
      tier,
      bestCellType: parsedCellType,
      bestCellBars: parsedCellBars,
      bestStarlinkQuality: parsedStarlinkQuality,
      readingCount: 0,
    };
  }

  // No logs and no summary strings — unknown
  return {
    tier: 'gray',
    bestCellType: null,
    bestCellBars: null,
    bestStarlinkQuality: null,
    readingCount: 0,
  };
}
