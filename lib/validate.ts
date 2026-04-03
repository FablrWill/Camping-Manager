/**
 * Safe number parsing — returns null instead of NaN.
 */
export function safeParseFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

export function safeParseInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

/**
 * Validate date string — returns Date or null.
 */
export function isValidDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Validate email with standard regex.
 */
export function isValidEmail(value: unknown): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
