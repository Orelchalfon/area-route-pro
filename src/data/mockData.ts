import { Technician, Customer, Job } from '@/types';

export const technicians: Technician[] = [
  { id: 't1', name: 'שילה', region: 'מרכז', skills: ['פילטרים', 'התקנות', 'תקלות'], phone: '+972-50-1234567' },
  { id: 't2', name: 'נריה', region: 'צפון', skills: ['פילטרים', 'תקלות', 'התקנות'], phone: '+972-52-2345678' },
];

const CITIES = [
  'דרום רחוק', 'דרום קרוב', 'דרום ת״א והסביבה', 'ירושלים והסביבה',
  'מרכז - פתח תקווה', 'הרצליה, רעננה והסביבה', 'שומרון', 'נתניה, עמק חפר',
  'צפון קרוב', 'צפון רחוק',
];

const PRODUCTS = ['מערכת אוסמוזה 5 שלבים', 'בר מים Eden', 'מסנן ברז ביתי', 'בר מים תמי4', 'מערכת סינון מרכזית'];

interface AddressEntry { address: string; lat: number; lng: number; }

const ADDRESSES: Record<string, AddressEntry[]> = {
  'דרום רחוק': [
    { address: 'דרך העצמאות 50, באר שבע', lat: 31.2518, lng: 34.7913 },
    { address: 'ההסתדרות 8, באר שבע', lat: 31.2430, lng: 34.7925 },
    { address: 'הדקל 7, אילת', lat: 29.5577, lng: 34.9519 },
    { address: 'שד׳ הנגב 12, דימונה', lat: 31.0695, lng: 35.0331 },
    { address: 'רגר 5, באר שבע', lat: 31.2510, lng: 34.7886 },
    { address: 'הנשיא 3, ערד', lat: 31.2590, lng: 35.2126 },
    { address: 'יצחק רבין 10, אופקים', lat: 31.3137, lng: 34.6197 },
    { address: 'הפלמ״ח 22, באר שבע', lat: 31.2462, lng: 34.7870 },
    { address: 'העצמאות 14, ירוחם', lat: 30.9876, lng: 34.9298 },
    { address: 'הרצל 8, מצפה רמון', lat: 30.6103, lng: 34.8013 },
  ],
  'דרום קרוב': [
    { address: 'דרך הים 10, אשדוד', lat: 31.8044, lng: 34.6553 },
    { address: 'ירושלים 55, אשקלון', lat: 31.6688, lng: 34.5743 },
    { address: 'השקד 2, יבנה', lat: 31.8786, lng: 34.7380 },
    { address: 'דרך הים 45, אשדוד', lat: 31.8112, lng: 34.6490 },
    { address: 'הגפן 15, קריית גת', lat: 31.6100, lng: 34.7649 },
    { address: 'שד׳ הנשיא 7, אשדוד', lat: 31.7983, lng: 34.6502 },
    { address: 'הזית 3, יבנה', lat: 31.8800, lng: 34.7408 },
    { address: 'בן גוריון 20, אשקלון', lat: 31.6653, lng: 34.5712 },
    { address: 'העצמאות 30, קריית מלאכי', lat: 31.7295, lng: 34.7467 },
    { address: 'הברוש 11, גדרה', lat: 31.8142, lng: 34.7765 },
  ],
  'דרום ת״א והסביבה': [
    { address: 'שמואל הנגיד 11, ראשון לציון', lat: 31.9642, lng: 34.8048 },
    { address: 'הנרייטה סולד 6, חולון', lat: 32.0117, lng: 34.7748 },
    { address: 'יוספטל 33, בת ים', lat: 32.0172, lng: 34.7505 },
    { address: 'כצנלסון 35, בת ים', lat: 32.0195, lng: 34.7520 },
    { address: 'הפרחים 12, נס ציונה', lat: 31.9295, lng: 34.7960 },
    { address: 'סמילנסקי 7, חולון', lat: 32.0148, lng: 34.7790 },
    { address: 'רוטשילד 14, ראשון לציון', lat: 31.9710, lng: 34.7892 },
    { address: 'הרצל 28, חולון', lat: 32.0103, lng: 34.7810 },
    { address: 'ז׳בוטינסקי 15, ראשון לציון', lat: 31.9688, lng: 34.7998 },
    { address: 'הבנים 9, נס ציונה', lat: 31.9310, lng: 34.7988 },
  ],
  'ירושלים והסביבה': [
    { address: 'קינג ג׳ורג׳ 23, ירושלים', lat: 31.7805, lng: 35.2180 },
    { address: 'יפו 30, ירושלים', lat: 31.7815, lng: 35.2155 },
    { address: 'המלך דוד 9, ירושלים', lat: 31.7740, lng: 35.2225 },
    { address: 'הזית 21, מודיעין', lat: 31.8938, lng: 35.0105 },
    { address: 'הנביאים 5, ירושלים', lat: 31.7848, lng: 35.2268 },
    { address: 'קרן היסוד 16, ירושלים', lat: 31.7728, lng: 35.2190 },
    { address: 'הברושים 11, מודיעין', lat: 31.8955, lng: 35.0068 },
    { address: 'בן יהודה 40, ירושלים', lat: 31.7810, lng: 35.2145 },
    { address: 'עזה 12, ירושלים', lat: 31.7730, lng: 35.2110 },
    { address: 'דרך בית לחם 7, ירושלים', lat: 31.7660, lng: 35.2340 },
  ],
  'מרכז - פתח תקווה': [
    { address: 'ז׳בוטינסקי 40, פתח תקווה', lat: 32.0910, lng: 34.8870 },
    { address: 'התמר 4, ראש העין', lat: 32.0960, lng: 34.9530 },
    { address: 'דרך בן גוריון 31, רמלה', lat: 31.9280, lng: 34.8640 },
    { address: 'שד׳ ירושלים 44, לוד', lat: 31.9510, lng: 34.8920 },
    { address: 'אחד העם 30, פתח תקווה', lat: 32.0875, lng: 34.8830 },
    { address: 'רוטשילד 5, פתח תקווה', lat: 32.0855, lng: 34.8848 },
    { address: 'הרצל 18, ראש העין', lat: 32.0938, lng: 34.9488 },
    { address: 'סטמפר 12, פתח תקווה', lat: 32.0922, lng: 34.8795 },
    { address: 'בילו 8, רמלה', lat: 31.9268, lng: 34.8618 },
    { address: 'העצמאות 25, לוד', lat: 31.9495, lng: 34.8905 },
  ],
  'הרצליה, רעננה והסביבה': [
    { address: 'סוקולוב 18, הרצליה', lat: 32.1622, lng: 34.7912 },
    { address: 'ויצמן 22, כפר סבא', lat: 32.1780, lng: 34.9065 },
    { address: 'אוסישקין 27, רעננה', lat: 32.1845, lng: 34.8710 },
    { address: 'יצחק רבין 13, הוד השרון', lat: 32.1530, lng: 34.8930 },
    { address: 'הברוש 8, רמת השרון', lat: 32.1460, lng: 34.8385 },
    { address: 'שד׳ בן ציון 9, הרצליה', lat: 32.1640, lng: 34.7948 },
    { address: 'שדרות הנשיא 20, רעננה', lat: 32.1862, lng: 34.8688 },
    { address: 'אחוזה 45, רעננה', lat: 32.1890, lng: 34.8752 },
    { address: 'הרצל 33, כפר סבא', lat: 32.1755, lng: 34.9085 },
    { address: 'המייסדים 6, הוד השרון', lat: 32.1505, lng: 34.8882 },
  ],
  'שומרון': [
    { address: 'המייסדים 17, עפולה', lat: 32.6082, lng: 35.2920 },
    { address: 'הגלבוע 14, עפולה', lat: 32.6068, lng: 35.2885 },
    { address: 'הרצל 8, אריאל', lat: 32.1048, lng: 35.1740 },
    { address: 'העצמאות 12, קדומים', lat: 32.1840, lng: 35.1530 },
    { address: 'הזית 5, אלפי מנשה', lat: 32.1722, lng: 35.0895 },
    { address: 'דרך השלום 3, עפולה', lat: 32.6055, lng: 35.2938 },
    { address: 'הגפן 7, אריאל', lat: 32.1062, lng: 35.1768 },
    { address: 'הדקל 9, אלקנה', lat: 32.1115, lng: 35.0362 },
    { address: 'בן גוריון 15, עפולה', lat: 32.6095, lng: 35.2905 },
    { address: 'הרימון 4, ברקן', lat: 32.1125, lng: 35.1192 },
  ],
  'נתניה, עמק חפר': [
    { address: 'הגליל 7, נתניה', lat: 32.3290, lng: 34.8568 },
    { address: 'העליה 20, חדרה', lat: 32.4370, lng: 34.9195 },
    { address: 'הרצליה 18, נתניה', lat: 32.3262, lng: 34.8545 },
    { address: 'שד׳ בנימין 10, נתניה', lat: 32.3318, lng: 34.8582 },
    { address: 'רזיאל 25, חדרה', lat: 32.4385, lng: 34.9218 },
    { address: 'הנשיא 8, נתניה', lat: 32.3275, lng: 34.8555 },
    { address: 'הרצל 40, חדרה', lat: 32.4400, lng: 34.9170 },
    { address: 'ויצמן 15, נתניה', lat: 32.3305, lng: 34.8538 },
    { address: 'סמילנסקי 12, חדרה', lat: 32.4355, lng: 34.9205 },
    { address: 'גורדון 6, נתניה', lat: 32.3248, lng: 34.8560 },
  ],
  'צפון קרוב': [
    { address: 'בן יהודה 8, חיפה', lat: 32.8148, lng: 34.9915 },
    { address: 'שד׳ הנשיא 15, חיפה', lat: 32.8095, lng: 34.9870 },
    { address: 'העצמאות 33, חיפה', lat: 32.8162, lng: 34.9932 },
    { address: 'הרצל 60, נצרת עילית', lat: 32.7060, lng: 35.3045 },
    { address: 'האלון 9, כרמיאל', lat: 32.9185, lng: 35.2992 },
    { address: 'התאנה 15, קריית מוצקין', lat: 32.8385, lng: 35.0742 },
    { address: 'הרימון 3, קריית ביאליק', lat: 32.8338, lng: 35.0855 },
    { address: 'העצמאות 22, עכו', lat: 32.9262, lng: 35.0755 },
    { address: 'המגינים 10, חיפה', lat: 32.8180, lng: 34.9895 },
    { address: 'הנביאים 18, חיפה', lat: 32.8125, lng: 34.9942 },
  ],
  'צפון רחוק': [
    { address: 'הגפן 24, טבריה', lat: 32.7928, lng: 35.5310 },
    { address: 'רמב״ם 4, טבריה', lat: 32.7942, lng: 35.5332 },
    { address: 'הרצל 15, צפת', lat: 32.9648, lng: 35.4962 },
    { address: 'העצמאות 8, קריית שמונה', lat: 33.2072, lng: 35.5715 },
    { address: 'הגליל 12, נהריה', lat: 33.0042, lng: 35.0948 },
    { address: 'דרך הים 5, נהריה', lat: 33.0068, lng: 35.0902 },
    { address: 'הרצל 20, צפת', lat: 32.9655, lng: 35.4978 },
    { address: 'המייסדים 3, ראש פינה', lat: 32.9690, lng: 35.5410 },
    { address: 'הגפן 7, מגדל', lat: 32.8235, lng: 35.5118 },
    { address: 'הזית 11, קריית שמונה', lat: 33.2088, lng: 35.5728 },
  ],
};

const FIRST_NAMES = ['שרה', 'מיכאל', 'רחל', 'דניאל', 'תמר', 'אייל', 'נועה', 'אורן', 'יעל', 'אבי', 'מורן', 'עידו', 'ליאת', 'רון', 'הדר', 'אלון', 'שירה', 'גיל', 'ענת', 'נדב', 'מיכל', 'יונתן', 'אורלי', 'דור', 'קרן', 'תומר', 'נעמי', 'עמיר', 'רותם', 'איתי', 'סיון', 'אלעד', 'ליאור', 'עדי', 'שחר', 'דנה', 'ניר', 'מעיין', 'עופר', 'טלי', 'ארז', 'הילה', 'בועז', 'שני', 'אריאל', 'יפית', 'אסף', 'מאיה', 'גלעד', 'רינת'];
const LAST_NAMES = ['גולדשטיין', 'רובין', 'מזרחי', 'פרץ', 'אברהמי', 'כץ', 'פרידמן', 'שוורץ', 'דהן', 'מלכה', 'ביטון', 'נחמיאס', 'שמעון', 'אזולאי', 'לביא', 'סגל', 'קפלן', 'חסון', 'ברק', 'עמרם', 'אופיר', 'גרינברג', 'טל', 'אשכנזי', 'וולף', 'שלום', 'הלל', 'צור', 'חן', 'מנדל', 'רוזנפלד', 'פינקלשטיין', 'הרשקוביץ', 'שפירו', 'נאמן', 'קורן', 'אדלר', 'זיו', 'רוזנברג', 'גולן', 'חביב', 'לוין', 'פלד', 'אלקובי', 'מאירי', 'אוחיון', 'דיין', 'כהן', 'שמש', 'אלפסי'];

// Generate unique full names using seeded shuffle to ensure all 1200 names are different
function generateUniqueNames(count: number): string[] {
  const names: string[] = [];
  const usedNames = new Set<string>();
  // Use all combinations first, then add suffix for extras
  for (let li = 0; li < LAST_NAMES.length && names.length < count; li++) {
    for (let fi = 0; fi < FIRST_NAMES.length && names.length < count; fi++) {
      const name = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        names.push(name);
      }
    }
  }
  // If we still need more (1200 > 50*50=2500 so we won't), add numbered variants
  let suffix = 2;
  while (names.length < count) {
    for (let li = 0; li < LAST_NAMES.length && names.length < count; li++) {
      for (let fi = 0; fi < FIRST_NAMES.length && names.length < count; fi++) {
        const name = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]} ${suffix}`;
        names.push(name);
      }
    }
    suffix++;
  }
  return names;
}

const UNIQUE_NAMES = generateUniqueNames(1200);

// Generate 1200 customers — 100 per month, spread across 10 regions
function generateCustomers(): Customer[] {
  const result: Customer[] = [];
  for (let i = 0; i < 1200; i++) {
    const month = Math.floor(i / 100) + 1; // 100 per month
    const cityIdx = i % 10;
    const city = CITIES[cityIdx];
    const addressEntry = ADDRESSES[city][Math.floor(i / 10) % ADDRESSES[city].length];
    const fullName = UNIQUE_NAMES[i];
    const product = PRODUCTS[i % PRODUCTS.length];

    result.push({
      id: `c${i + 1}`,
      name: fullName,
      phone: `+972-5${i % 5}-${String(1000000 + i).slice(-7)}`,
      address: addressEntry.address,
      city,
      email: `${fullName.split(' ')[0].toLowerCase()}${i}@email.com`,
      product,
      filterReplacementMonth: month,
      lat: addressEntry.lat,
      lng: addressEntry.lng,
    });
  }
  return result;
}

export const customers: Customer[] = generateCustomers();

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const currentYear = today.getFullYear();

// Generate filter replacement jobs for all 1200 customers
function generateFilterJobs(): Job[] {
  return customers.map((c) => ({
    id: `filter-${currentYear}-${c.filterReplacementMonth}-${c.id}`,
    type: 'filter_replacement' as const,
    status: 'draft' as const,
    priority: 'low' as const,
    customerId: c.id,
    estimatedDuration: 25,
    location: c.address,
    city: c.city,
    notes: 'החלפת פילטר שנתית',
    createdAt: `${currentYear}-${String(c.filterReplacementMonth).padStart(2, '0')}-01`,
  }));
}

// תקלות והתקנות + כל משימות החלפת הפילטרים
export const initialJobs: Job[] = [
  ...generateFilterJobs(),
  // ===== תקלות (20) =====
  { id: 'j1',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c2',  estimatedDuration: 60, location: customers[1].address,  city: customers[1].city,  notes: 'אין מים קרים — דחוף',   createdAt: todayStr },
  { id: 'j2',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c10', estimatedDuration: 60, location: customers[9].address,  city: customers[9].city,  notes: 'תקלה בחימום',           createdAt: todayStr },
  { id: 'j3',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c3',  estimatedDuration: 60, location: customers[2].address,  city: customers[2].city,  notes: 'נזילה ביחידה',          createdAt: todayStr },
  { id: 'j4',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c34', estimatedDuration: 60, location: customers[33].address, city: customers[33].city, notes: 'תקלה במשאבה',           createdAt: todayStr },
  { id: 'j5',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c11', estimatedDuration: 60, location: customers[10].address, city: customers[10].city, notes: 'רעש חריג מהמערכת',      createdAt: todayStr },
  { id: 'j6',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c39', estimatedDuration: 60, location: customers[38].address, city: customers[38].city, notes: 'דליפה מהמערכת',         createdAt: todayStr },
  { id: 'j7',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c14', estimatedDuration: 60, location: customers[13].address, city: customers[13].city, notes: 'לחץ מים נמוך',          createdAt: todayStr },
  { id: 'j8',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c28', estimatedDuration: 60, location: customers[27].address, city: customers[27].city, notes: 'נזילה',                 createdAt: todayStr },
  { id: 'j9',  type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c20', estimatedDuration: 60, location: customers[19].address, city: customers[19].city, notes: 'המערכת לא נדלקת',       createdAt: todayStr },
  { id: 'j10', type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c42', estimatedDuration: 60, location: customers[41].address, city: customers[41].city, notes: 'רעש חזק',               createdAt: todayStr },
  { id: 'j11', type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c36', estimatedDuration: 60, location: customers[35].address, city: customers[35].city, notes: 'רעש חריג',              createdAt: todayStr },
  { id: 'j12', type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c41', estimatedDuration: 60, location: customers[40].address, city: customers[40].city, notes: 'דליפה חזקה',            createdAt: todayStr },
  { id: 'j13', type: 'malfunction', status: 'draft', priority: 'high',   customerId: 'c38', estimatedDuration: 60, location: customers[37].address, city: customers[37].city, notes: 'תקלה במשאבה',           createdAt: todayStr },
  { id: 'j14', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c5',  estimatedDuration: 60, location: customers[4].address,  city: customers[4].city,  notes: 'טפטוף מהמסנן',          createdAt: todayStr },
  { id: 'j15', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c9',  estimatedDuration: 60, location: customers[8].address,  city: customers[8].city,  notes: 'לחץ לא יציב',           createdAt: todayStr },
  { id: 'j16', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c22', estimatedDuration: 60, location: customers[21].address, city: customers[21].city, notes: 'מים עכורים',            createdAt: todayStr },
  { id: 'j17', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c30', estimatedDuration: 60, location: customers[29].address, city: customers[29].city, notes: 'ריח רע מהמים',          createdAt: todayStr },
  { id: 'j18', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c25', estimatedDuration: 60, location: customers[24].address, city: customers[24].city, notes: 'לא מקרר',               createdAt: todayStr },
  { id: 'j19', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c27', estimatedDuration: 60, location: customers[26].address, city: customers[26].city, notes: 'נזילה קלה',             createdAt: todayStr },
  { id: 'j20', type: 'malfunction', status: 'draft', priority: 'medium', customerId: 'c45', estimatedDuration: 60, location: customers[44].address, city: customers[44].city, notes: 'רעש בלילה',             createdAt: todayStr },

  // ===== התקנות (20) =====
  { id: 'j21', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c15', estimatedDuration: 120, location: customers[14].address, city: customers[14].city, notes: 'התקנת בר מים תמי4',     createdAt: todayStr },
  { id: 'j22', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c24', estimatedDuration: 120, location: customers[23].address, city: customers[23].city, notes: 'התקנת מערכת אוסמוזה',   createdAt: todayStr },
  { id: 'j23', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c33', estimatedDuration: 120, location: customers[32].address, city: customers[32].city, notes: 'התקנה חדשה',            createdAt: todayStr },
  { id: 'j24', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c44', estimatedDuration: 120, location: customers[43].address, city: customers[43].city, notes: 'התקנת מערכת סינון',     createdAt: todayStr },
  { id: 'j25', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c4',  estimatedDuration: 120, location: customers[3].address,  city: customers[3].city,  notes: 'התקנת מערכת פרימיום',    createdAt: todayStr },
  { id: 'j26', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c26', estimatedDuration: 120, location: customers[25].address, city: customers[25].city, notes: 'התקנה חדשה',            createdAt: todayStr },
  { id: 'j27', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c13', estimatedDuration: 120, location: customers[12].address, city: customers[12].city, notes: 'התקנה חדשה',            createdAt: todayStr },
  { id: 'j28', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c18', estimatedDuration: 120, location: customers[17].address, city: customers[17].city, notes: 'התקנת בר מים',          createdAt: todayStr },
  { id: 'j29', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c43', estimatedDuration: 120, location: customers[42].address, city: customers[42].city, notes: 'התקנה חדשה',            createdAt: todayStr },
  { id: 'j30', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c29', estimatedDuration: 120, location: customers[28].address, city: customers[28].city, notes: 'התקנת מערכת חדשה',      createdAt: todayStr },
];
