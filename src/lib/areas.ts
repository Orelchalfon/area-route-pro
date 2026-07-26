import { Job } from '@/types';
import { SETTLEMENT_AREA, SETTLEMENT_SUB_AREA, type SubArea } from '@/lib/generated/settlementAreas';

export type { SubArea };

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
// in the imported customer data. Add new cities here as they appear.
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
  // Modi'in-Maccabim-Re'ut: CBS files it under מרכז/שפלה, but operationally it's the
  // same Modi'in area the manager works as 'ירושלים' (business override, like מודיעין
  // above). Both the spaced and hyphenated Hebrew forms are pinned so the hyphen/space
  // fallback below doesn't send it to CBS's מרכז.
  'מודיעין מכבים רעות': 'ירושלים',
  'מודיעין-מכבים-רעות': 'ירושלים',
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
  // Hebrew spelling variants that don't match the CBS key (final א vs ה, etc.).
  'בורגתא': 'בורגתה',
};

// Latin/English locality names → canonical Hebrew key. Addresses picked before the
// Maps API was loaded in Hebrew stored Google's English `locality.long_name`
// (e.g. "Modi'in Makabim-Re'ut"), which no Hebrew-keyed area map recognises. Keyed by
// a punctuation-insensitive, lower-cased canonical form (see canonicalizeLatin). New
// entries now store Hebrew (googleMapsConfig loads with language:'he'); this covers
// rows saved earlier and is the runtime fallback for any that lack a placeId to
// re-geocode. Extend as the discovery/backfill script surfaces more.
const CITY_ALIASES_LATIN: Record<string, string> = {
  'modiin makabim reut': 'מודיעין',
  'modiin maccabim reut': 'מודיעין',
  'modiin': 'מודיעין',
  'tel aviv yafo': 'תל אביב',
  'tel aviv': 'תל אביב',
  'herzliya': 'הרצליה',
  'haifa': 'חיפה',
  'jerusalem': 'ירושלים',
  'beer sheva': 'באר שבע',
  'petah tikva': 'פתח תקווה',
  'raanana': 'רעננה',
  'kfar saba': 'כפר סבא',
  'netanya': 'נתניה',
  'rishon lezion': 'ראשון לציון',
  'rehovot': 'רחובות',
};

/** Punctuation-insensitive, lower-cased canonical form of a Latin locality string. */
function canonicalizeLatin(s: string): string {
  // Drop apostrophe variants so "Modi'in" -> "modiin" (not "modi in"), then treat any
  // other punctuation/whitespace run as a single separator.
  return s.toLowerCase().replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Multi-word keys, longest first, for substring matching of compound entries
// like "סביוני הכרמל חיפה" or "נווה ים הרצליה".
const SUBSTRING_KEYS = Object.keys(CITY_AREA)
  .filter((c) => c.includes(' '))
  .sort((a, b) => b.length - a.length);

/** Trim, collapse internal whitespace, and resolve known aliases (Hebrew + Latin). */
export function normalizeCity(city: string): string {
  const cleaned = (city || '').replace(/\s+/g, ' ').trim();
  const hebrewAlias = CITY_ALIASES[cleaned];
  if (hebrewAlias) return hebrewAlias;
  // Latin/English localities (e.g. "Modi'in Makabim-Re'ut") → Hebrew canonical.
  if (/[a-z]/i.test(cleaned)) {
    const latinAlias = CITY_ALIASES_LATIN[canonicalizeLatin(cleaned)];
    if (latinAlias) return latinAlias;
  }
  return cleaned;
}

// keep in sync with scripts/generate_settlement_areas.mjs normalizeCityName
/** Normalize a city string into the key format used by the generated settlement maps. */
export function normalizeCityName(name: string): string {
  let s = String(name ?? '');
  s = s.normalize('NFC');
  // Drop trailing/any parenthetical qualifiers, e.g. "נהלל (מושב)" -> "נהלל".
  s = s.replace(/[（(][^）)]*[）)]/g, ' ');
  // Unify maqaf/hyphen variants to a plain hyphen.
  s = s.replace(/־/g, '-');
  // Strip geresh/gershayim variants.
  s = s.replace(/[׳״'"`]/g, '');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Look a normalized city up in a generated settlement map, tolerating the CBS
 * convention of joining multi-part names with a hyphen (e.g. "מודיעין-מכבים-רעות")
 * while app data often uses spaces ("מודיעין מכבים רעות"), and vice versa.
 */
function lookupSettlement<T>(map: Record<string, T>, normalizedCity: string): T | undefined {
  const key = normalizeCityName(normalizedCity);
  return map[key] ?? map[key.replace(/ /g, '-')] ?? map[key.replace(/-/g, ' ')];
}

/** Resolve a (possibly messy) city string to its area, or the fallback bucket. */
export function areaForCity(city: string): AreaOrUnassigned {
  const normalized = normalizeCity(city);
  if (!normalized) return UNASSIGNED_AREA;

  const direct = CITY_AREA[normalized];
  if (direct) return direct;

  // Generated settlement data (CBS-derived), covering the long tail of cities
  // not curated in CITY_AREA above.
  const settlementHit = lookupSettlement(SETTLEMENT_AREA, normalized);
  if (settlementHit) return settlementHit;

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

/** Best-effort sub-area lookup from the generated settlement data. Never throws. */
export function getSubArea(city: string): SubArea | undefined {
  const normalized = normalizeCity(city);
  if (!normalized) return undefined;
  return lookupSettlement(SETTLEMENT_SUB_AREA, normalized);
}

export interface CityGroup {
  city: string;
  jobs: Job[];
  /** CBS-derived sub-area for the city, when known (metadata for UI labels). */
  subArea?: SubArea;
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
      .map(([city, cityJobs]) => ({
        city,
        jobs: [...cityJobs].sort(byDateTime),
        subArea: getSubArea(city),
      }));
    const count = cityGroups.reduce((sum, g) => sum + g.jobs.length, 0);
    result.push({ area, count, cities: cityGroups });
  }
  return result;
}
