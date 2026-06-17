import { Job } from '@/types';

// Areas (אזורים) the app imposes on top of the per-city data. The source sheets
// lay rows out by hand-entered region columns that are unreliable (e.g. חיפה under
// "דרום"), so the area is derived from the *city name* by real geography instead.
// Ordered roughly north→south so sections render in a stable, intuitive order.
export const AREAS = ['צפון', 'מרכז', 'שומרון', 'ירושלים', 'דרום'] as const;
export type Area = (typeof AREAS)[number];

// Bucket for any city not found in CITY_AREA — visible and easy to extend.
export const UNASSIGNED_AREA = 'אחר / לא משויך';
export type AreaOrUnassigned = Area | typeof UNASSIGNED_AREA;

// All area sections in render order, with the fallback bucket last.
export const AREA_ORDER: AreaOrUnassigned[] = [...AREAS, UNASSIGNED_AREA];

// Curated city → area map, by real Israeli geography. Seeded from every city seen
// in sheets/*.csv and src/data/mockData.ts. Add new cities here as they appear.
export const CITY_AREA: Record<string, Area> = {
  // צפון — Haifa district + Galilee + Carmel coast
  'חיפה': 'צפון',
  'יקנעם': 'צפון',
  'חדרה': 'צפון',
  'זכרון יעקב': 'צפון',
  'בנימינה': 'צפון',
  'נהריה': 'צפון',
  'קיסריה': 'צפון',
  'שמשית': 'צפון',
  'צפת': 'צפון',
  'פרדס חנה': 'צפון',
  'חריש': 'צפון',

  // מרכז — Sharon + Gush Dan + Shfela
  'הרצליה': 'מרכז',
  'פתח תקווה': 'מרכז',
  'פתח תקוה': 'מרכז',
  'תל אביב': 'מרכז',
  'רמת השרון': 'מרכז',
  'רעננה': 'מרכז',
  'כפר סבא': 'מרכז',
  'נתניה': 'מרכז',
  'פרדסיה': 'מרכז',
  'אבן יהודה': 'מרכז',
  'עין ורד': 'מרכז',
  'צופית': 'מרכז',
  'בצרה': 'מרכז',
  'בני ציון': 'מרכז',
  'צורן': 'מרכז',
  'רמת גן': 'מרכז',
  'גבעתיים': 'מרכז',
  'גבעת שמואל': 'מרכז',
  'בת ים': 'מרכז',
  'חולון': 'מרכז',
  'ראשון לציון': 'מרכז',
  'רחובות': 'מרכז',
  'נס ציונה': 'מרכז',
  'יבנה': 'מרכז',
  'גן יבנה': 'מרכז',
  'גדרה': 'מרכז',
  'יהוד': 'מרכז',
  'באר יעקב': 'מרכז',

  // שומרון — Samaria settlements
  'אבני חפץ': 'שומרון',
  'ברוכין': 'שומרון',
  'אורנית': 'שומרון',
  'שילה': 'שומרון',

  // ירושלים — Jerusalem + Modiin + Judea foothills
  'ירושלים': 'ירושלים',
  'מודיעין': 'ירושלים',
  'מבשרת ציון': 'ירושלים',
  'צור הדסה': 'ירושלים',
  'אפרת': 'ירושלים',
  'נחלה': 'ירושלים',

  // דרום — Negev + southern coastal plain
  'באר שבע': 'דרום',
  'אילת': 'דרום',
  'דימונה': 'דרום',
  'אשדוד': 'דרום',
  'אשקלון': 'דרום',
  'קריית גת': 'דרום',
  'קרית גת': 'דרום',
  'קריית מלאכי': 'דרום',
  'תקומה': 'דרום',
  'הודיה': 'דרום',
};

// Known spelling/abbreviation variants → canonical key in CITY_AREA.
const CITY_ALIASES: Record<string, string> = {
  'ת"א': 'תל אביב',
  'ת״א': 'תל אביב',
  'רמת השרן': 'רמת השרון',
  'ק.גת': 'קריית גת',
  'קיסירה': 'קיסריה',
};

// Multi-word keys, longest first, for substring matching of compound entries
// like "סביוני הכרמל חיפה" or "נווה ים הרצליה".
const SUBSTRING_KEYS = Object.keys(CITY_AREA)
  .filter((c) => c.includes(' '))
  .sort((a, b) => b.length - a.length);

/** Trim, collapse internal whitespace, and resolve known aliases. */
export function normalizeCity(city: string): string {
  const cleaned = (city || '').replace(/\s+/g, ' ').trim();
  return CITY_ALIASES[cleaned] ?? cleaned;
}

/** Resolve a (possibly messy) city string to its area, or the fallback bucket. */
export function areaForCity(city: string): AreaOrUnassigned {
  const normalized = normalizeCity(city);
  if (!normalized) return UNASSIGNED_AREA;

  const direct = CITY_AREA[normalized];
  if (direct) return direct;

  // Compound free-text entries: match a known multi-word city contained in the string.
  for (const key of SUBSTRING_KEYS) {
    if (normalized.includes(key)) return CITY_AREA[key];
  }
  // Last resort: any single-token known city contained in the string.
  for (const token of normalized.split(' ')) {
    const hit = CITY_AREA[token];
    if (hit) return hit;
  }
  return UNASSIGNED_AREA;
}

export interface CityGroup {
  city: string;
  jobs: Job[];
}

export interface AreaGroup {
  area: AreaOrUnassigned;
  count: number;
  cities: CityGroup[];
}

const byDateTime = (a: Job, b: Job) =>
  (a.scheduledDate || '').localeCompare(b.scheduledDate || '') ||
  (a.scheduledTime || '').localeCompare(b.scheduledTime || '');

/**
 * Group jobs into ordered areas, each holding alphabetically-sorted cities whose
 * jobs are sorted by date/time. Areas follow AREA_ORDER; empty areas are omitted.
 */
export function groupJobsByArea(jobs: Job[]): AreaGroup[] {
  const areaMap = new Map<AreaOrUnassigned, Map<string, Job[]>>();

  for (const job of jobs) {
    const city = normalizeCity(job.city) || 'לא צוין';
    const area = areaForCity(job.city);
    let cities = areaMap.get(area);
    if (!cities) {
      cities = new Map();
      areaMap.set(area, cities);
    }
    const list = cities.get(city);
    if (list) list.push(job);
    else cities.set(city, [job]);
  }

  const result: AreaGroup[] = [];
  for (const area of AREA_ORDER) {
    const cities = areaMap.get(area);
    if (!cities) continue;
    const cityGroups: CityGroup[] = [...cities.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, cityJobs]) => ({ city, jobs: [...cityJobs].sort(byDateTime) }));
    const count = cityGroups.reduce((sum, g) => sum + g.jobs.length, 0);
    result.push({ area, count, cities: cityGroups });
  }
  return result;
}
