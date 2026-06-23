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
