import { describe, it, expect } from 'vitest';
import { getSignalTier, aggregateSignalSummaries } from '../signal-summary';

describe('getSignalTier', () => {
  it('Test 1: returns "green" for cellType "LTE" with cellBars 3', () => {
    expect(getSignalTier({ cellType: 'LTE', cellBars: 3, starlinkQuality: null })).toBe('green');
  });

  it('Test 2: returns "green" for cellType "5G" with cellBars 4', () => {
    expect(getSignalTier({ cellType: '5G', cellBars: 4, starlinkQuality: null })).toBe('green');
  });

  it('Test 3: returns "green" for starlinkQuality "strong"', () => {
    expect(getSignalTier({ cellType: null, cellBars: null, starlinkQuality: 'strong' })).toBe('green');
  });

  it('Test 4: returns "green" for starlinkQuality "excellent"', () => {
    expect(getSignalTier({ cellType: null, cellBars: null, starlinkQuality: 'excellent' })).toBe('green');
  });

  it('Test 5: returns "yellow" for cellType "LTE" with cellBars 2', () => {
    expect(getSignalTier({ cellType: 'LTE', cellBars: 2, starlinkQuality: null })).toBe('yellow');
  });

  it('Test 6: returns "yellow" for cellType "LTE" with cellBars 1', () => {
    expect(getSignalTier({ cellType: 'LTE', cellBars: 1, starlinkQuality: null })).toBe('yellow');
  });

  it('Test 7: returns "yellow" for starlinkQuality "moderate"', () => {
    expect(getSignalTier({ cellType: null, cellBars: null, starlinkQuality: 'moderate' })).toBe('yellow');
  });

  it('Test 8: returns "red" for cellType "none"', () => {
    expect(getSignalTier({ cellType: 'none', cellBars: null, starlinkQuality: null })).toBe('red');
  });

  it('Test 9: returns "red" for cellBars 0 regardless of cellType', () => {
    expect(getSignalTier({ cellType: 'LTE', cellBars: 0, starlinkQuality: null })).toBe('red');
  });

  it('Test 10: returns "gray" when all signal fields are null/undefined', () => {
    expect(getSignalTier({ cellType: null, cellBars: null, starlinkQuality: null })).toBe('gray');
  });
});

describe('aggregateSignalSummaries', () => {
  it('Test 11: picks the best tier from multiple logs for a location', () => {
    const logs = [
      { cellBars: 1, cellType: 'LTE', starlinkQuality: null },
      { cellBars: 4, cellType: '5G', starlinkQuality: null },
      { cellBars: 0, cellType: 'none', starlinkQuality: null },
    ];
    const result = aggregateSignalSummaries(logs, null, null);
    expect(result.tier).toBe('green');
    expect(result.bestCellBars).toBe(4);
    expect(result.bestCellType).toBe('5G');
    expect(result.readingCount).toBe(3);
  });

  it('Test 12: falls back to Location.cellSignal/starlinkSignal strings when no SignalLog entries exist', () => {
    const result = aggregateSignalSummaries([], 'LTE 3 bars', null);
    expect(result.tier).toBe('green');
    expect(result.readingCount).toBe(0);
  });

  it('falls back to gray when no logs and no location strings', () => {
    const result = aggregateSignalSummaries([], null, null);
    expect(result.tier).toBe('gray');
    expect(result.bestCellType).toBeNull();
    expect(result.bestCellBars).toBeNull();
    expect(result.bestStarlinkQuality).toBeNull();
    expect(result.readingCount).toBe(0);
  });

  it('derives tier from starlinkSignal fallback string', () => {
    const result = aggregateSignalSummaries([], null, 'moderate');
    expect(result.tier).toBe('yellow');
    expect(result.bestStarlinkQuality).toBe('moderate');
  });

  it('picks best starlink quality across multiple logs', () => {
    const logs = [
      { cellBars: null, cellType: null, starlinkQuality: 'weak' },
      { cellBars: null, cellType: null, starlinkQuality: 'strong' },
    ];
    const result = aggregateSignalSummaries(logs, null, null);
    expect(result.bestStarlinkQuality).toBe('strong');
    expect(result.tier).toBe('green');
  });
});
