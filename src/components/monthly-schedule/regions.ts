import { Job } from "@/types";

// Fine-grained scheduling regions (אזורים) used by the monthly board's area
// filter. This is a *finer* breakdown than the 5 coarse areas in
// `@/lib/areas.ts` (which derive a city's area from geography). The two models
// are intentionally separate — do not merge without reconciling the taxonomies.
export const REGIONS = [
  "דרום רחוק",
  "מרכז דרום",
  "תל אביב",
  "ירושלים",
  "גוש דן",
  "השרון",
  "נתניה",
  "צפון קרוב",
  "צפון רחוק",
  "שומרון",
];

// Bucket for jobs whose city resolves to none of the real REGIONS above. Lets the
// manager still filter/schedule a client whose city isn't mapped yet (e.g. a freshly
// added customer in an out-of-list town). Kept out of REGIONS so it stays a real-region
// list; the picker appends it and jobMatchesAreas handles it explicitly.
export const UNASSIGNED_REGION = "לא משויך";

// Map specific cities to their parent region
const CITY_TO_REGION: Record<string, string> = {
  // השרון
  רעננה: "השרון",
  הרצליה: "השרון",
  "הרצליה פיתוח": "השרון",
  "הוד השרון": "השרון",
  "רמת השרון": "השרון",
  "כפר סבא": "השרון",
  "צפון תל אביב": "השרון",
  "רמת החייל": "השרון",
  ארסוף: "השרון",
  // תל אביב
  "תל אביב יפו": "תל אביב",
  יפו: "תל אביב",
  "רמת גן": "תל אביב",
  גבעתיים: "תל אביב",
  "בני ברק": "תל אביב",
  חולון: "תל אביב",
  אזור: "תל אביב",
  // גוש דן
  "פתח תקוה": "גוש דן",
  "פתח תקווה": "גוש דן",
  "ראש העין": "גוש דן",
  "קריית אונו": "גוש דן",
  יהוד: "גוש דן",
  "גבעת שמואל": "גוש דן",
  "אור יהודה": "גוש דן",
  // מרכז דרום
  "בת ים": "מרכז דרום",
  "ראשון לציון": "מרכז דרום",
  ראשלצ: "מרכז דרום",
  רחובות: "מרכז דרום",
  "נס ציונה": "מרכז דרום",
  יבנה: "מרכז דרום",
  גדרה: "מרכז דרום",
  לוד: "מרכז דרום",
  רמלה: "מרכז דרום",
  "באר יעקב": "מרכז דרום",
  "גן יבנה": "מרכז דרום",
  // ירושלים
  מודיעין: "ירושלים",
  "מודיעין מכבים רעות": "ירושלים",
  שוהם: "ירושלים",
  "גוש עציון": "ירושלים",
  "מעלה אדומים": "ירושלים",
  "בית שמש": "ירושלים",
  "ביתר עילית": "ירושלים",
  "מבשרת ציון": "ירושלים",
  // דרום רחוק
  "באר שבע": "דרום רחוק",
  אילת: "דרום רחוק",
  דימונה: "דרום רחוק",
  אשדוד: "דרום רחוק",
  אשקלון: "דרום רחוק",
  "קריית גת": "דרום רחוק",
  "קרית גת": "דרום רחוק",
  "קריית מלאכי": "דרום רחוק",
  "קרית מלאכי": "דרום רחוק",
  נתיבות: "דרום רחוק",
  // נתניה
  "עמק חפר": "נתניה",
  "קדימה צורן": "נתניה",
  "אבן יהודה": "נתניה",
  נתניה: "נתניה",
  "כפר הס": "נתניה",
  עולש: "נתניה",
  "עין ורד": "נתניה",
  // צפון קרוב
  חדרה: "צפון קרוב",
  בנימינה: "צפון קרוב",
  "פרדס חנה": "צפון קרוב",
  קיסריה: "צפון קרוב",
  חריש: "צפון קרוב",
  "אור עקיבא": "צפון קרוב",
  כרכור: "צפון קרוב",
  עתלית: "צפון קרוב",
  אליכין: "צפון קרוב",
  // צפון רחוק
  חיפה: "צפון רחוק",
  נהריה: "צפון רחוק",
  צפת: "צפון רחוק",
  כרמיאל: "צפון רחוק",
  "זיכרון יעקב": "צפון רחוק",
  "בית רימון": "צפון רחוק",
  "קריית שמונה": "צפון רחוק",
  עכו: "צפון רחוק",
  טבריה: "צפון רחוק",
  נצרת: "צפון רחוק",
  עפולה: "צפון רחוק",
  "נווה ים": "צפון רחוק",
  ערד: "צפון רחוק",
  "מצפה רמון": "צפון רחוק",
  יהל: "צפון רחוק",
  "טירת כרמל": "צפון רחוק",
  נשר: "צפון רחוק",
  מגידו: "צפון רחוק",
  יקנעם: "צפון רחוק",
  "יקנעם עילית": "צפון רחוק",
  // שומרון
  אריאל: "שומרון",
  ברקן: "שומרון",
  "קרני שומרון": "שומרון",
  אלקנה: "שומרון",
  עמנואל: "שומרון",
  קדומים: "שומרון",
  רבבה: "שומרון",
  יקיר: "שומרון",
  "שערי תקווה": "שומרון",
  "אבני חפץ": "שומרון",
  "מעלה שומרון": "שומרון",
  "גינות שומרון": "שומרון",
  ברוכין: "שומרון",
  "עץ אפרים": "שומרון",
  "אלפי מנשה": "שומרון",
  "כפר תפוח": "שומרון",
  "שבי שומרון": "שומרון",
  עלי: "שומרון",
  "מעלה לבונה": "שומרון",
  אופרה: "שומרון",
  "בית אריה": "שומרון",
  "בית אל": "שומרון",
  'ניל"י': "שומרון",
  חשמונאים: "שומרון",
};

/** Whether a city resolves to any real region (direct name, map, or partial match). */
function cityHasRegion(city: string): boolean {
  if (!city) return false;
  if ((REGIONS as string[]).includes(city)) return true;
  if (CITY_TO_REGION[city]) return true;
  return REGIONS.some((r) => city.includes(r) || r.includes(city));
}

/** Check if a job's city belongs to any of the selected regions */
export function jobMatchesAreas(job: Job, areas: string[]): boolean {
  if (areas.length === 0) return true;
  const city = (job.city || "").trim();
  // Direct match (city IS a region name)
  if (areas.includes(city)) return true;
  // Map city to region
  const region = CITY_TO_REGION[city];
  if (region && areas.includes(region)) return true;
  // Partial match: check if city contains or is contained by a region name.
  // Skip the unassigned bucket here so its label can't spuriously partial-match.
  for (const area of areas) {
    if (area === UNASSIGNED_REGION) continue;
    if (city.includes(area) || area.includes(city)) return true;
  }
  // Unassigned bucket: surface jobs no real region claims.
  if (areas.includes(UNASSIGNED_REGION) && !cityHasRegion(city)) return true;
  return false;
}
