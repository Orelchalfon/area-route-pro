// Hebrew date formatting helpers (Israel timezone).

/**
 * Format an ISO date (e.g. createdAt "2026-06-23") as a Hebrew date string,
 * date only, in the Asia/Jerusalem timezone. Used as a fallback for the
 * "opened on" stamp on jobs that predate the openedDate field (e.g. DB-loaded
 * rows). Returns an empty string for missing/invalid input.
 */
export function formatHebrewDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
}

/**
 * Format a moment as a Hebrew date + time string (date and HH:mm, no seconds) in
 * the Asia/Jerusalem timezone. Used to stamp when a request is opened. Defaults
 * to "now" so call sites can use formatHebrewDateTime() directly.
 */
export function formatHebrewDateTime(date: Date = new Date()): string {
  return date.toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
