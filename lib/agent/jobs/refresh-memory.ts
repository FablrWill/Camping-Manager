/**
 * refresh-memory.ts — Job handler for refreshing the agent memory summary.
 *
 * Condenses all AgentMemory entries into a single compact paragraph
 * stored under the '__summary__' key. Keeps context injection under
 * 500 tokens regardless of how many individual memory entries exist.
 *
 * Triggered by AgentJob type "memory_refresh".
 */

import { refreshMemorySummary } from '@/lib/agent/memory';

export interface RefreshMemoryPayload {
  // No input needed — reads from DB directly
}

export interface RefreshMemoryResult {
  message: string;
  refreshedAt: string;
}

export async function processRefreshMemory(
  _payload: RefreshMemoryPayload
): Promise<RefreshMemoryResult> {
  await refreshMemorySummary();

  return {
    message: 'Memory summary refreshed successfully.',
    refreshedAt: new Date().toISOString(),
  };
}
