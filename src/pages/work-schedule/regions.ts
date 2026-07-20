import { getSubArea } from '@/lib/areas';

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Resolve a city to its CBS-derived sub-area (גוש דן, השרון, שפלה ומרכז, ...),
// falling back to the raw city name when CBS has no sub-area for it, so a day's
// area summary always shows something. Backed by the same generated data as the
// monthly board — no separate hand-maintained region map.
export function getRegion(city: string): string {
  return getSubArea(city) ?? (city || '').trim();
}
