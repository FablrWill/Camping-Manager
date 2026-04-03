/**
 * Safely parse JSON from DB-stored strings.
 * Returns parsed value or null on failure. Never throws.
 */
export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
