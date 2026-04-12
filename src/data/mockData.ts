import { Technician, Customer, Job } from '@/types';

export const technicians: Technician[] = [
  { id: 't1', name: 'שילה', region: 'מרכז', skills: ['פילטרים', 'התקנות', 'תקלות'], phone: '+972-50-1234567' },
  { id: 't2', name: 'נריה', region: 'צפון', skills: ['פילטרים', 'תקלות', 'התקנות'], phone: '+972-52-2345678' },
];

const CITIES = [
  'דרום רחוק', 'מרכז דרום', 'תל אביב', 'ירושלים',
  'גוש דן', 'השרון', 'נתניה', 'צפון קרוב', 'צפון רחוק', 'שומרון',
];

const PRODUCTS = ['מערכת אוסמוזה 5 שלבים', 'בר מים Eden', 'מסנן ברז ביתי', 'בר מים תמי4', 'מערכת סינון מרכזית'];

interface AddressEntry { address: string; lat: number; lng: number; }

const ADDRESSES: Record<string, AddressEntry[]> = {
  'דרום רחוק': [
    { address: 'דרך העצמאות 50, באר שבע', lat: 31.2402129, lng: 34.7900568 },
    { address: 'ההסתדרות 8, באר שבע', lat: 31.2374429, lng: 34.7869685 },
    { address: 'הדקל 7, אילת', lat: 29.56471, lng: 34.947531 },
    { address: 'שד׳ הנגב 12, דימונה', lat: 31.069419, lng: 35.033363 },
    { address: 'רגר 5, באר שבע', lat: 31.244835, lng: 34.795244 },
    { address: 'דרך הים 10, אשדוד', lat: 31.804381, lng: 34.655314 },
    { address: 'ירושלים 55, אשקלון', lat: 31.6687885, lng: 34.5742523 },
    { address: 'הגפן 15, קריית גת', lat: 31.6064195, lng: 34.7721155 },
    { address: 'שד׳ הנשיא 7, אשדוד', lat: 31.7978059, lng: 34.6560212 },
    { address: 'העצמאות 30, קריית מלאכי', lat: 31.7914766, lng: 34.6445257 },
  ],
  'מרכז דרום': [
    { address: 'יוספטל 33, בת ים', lat: 32.0173973, lng: 34.7451343 },
    { address: 'כצנלסון 35, בת ים', lat: 32.0216205, lng: 34.7545495 },
    { address: 'שמואל הנגיד 11, ראשון לציון', lat: 31.9957441, lng: 34.7507542 },
    { address: 'רוטשילד 14, ראשון לציון', lat: 31.9643384, lng: 34.8054383 },
    { address: 'ז׳בוטינסקי 15, ראשון לציון', lat: 31.9599567, lng: 34.8010528 },
    { address: 'הפרחים 12, רחובות', lat: 31.8941, lng: 34.8113 },
    { address: 'הרצל 20, רחובות', lat: 31.8969, lng: 34.8093 },
    { address: 'השקד 2, יבנה', lat: 31.8757953, lng: 34.7390727 },
    { address: 'הזית 3, יבנה', lat: 31.8771383, lng: 34.7388138 },
    { address: 'הברוש 11, גדרה', lat: 31.8060331, lng: 34.7859814 },
  ],
  'תל אביב': [
    { address: 'אלנבי 40, תל אביב', lat: 32.0653, lng: 34.7717 },
    { address: 'דיזנגוף 99, תל אביב', lat: 32.0789, lng: 34.7735 },
    { address: 'רוטשילד 22, תל אביב', lat: 32.0634, lng: 34.7722 },
    { address: 'יפת 30, יפו', lat: 32.0503, lng: 34.7515 },
    { address: 'ביאליק 15, רמת גן', lat: 32.0826, lng: 34.8126 },
    { address: 'ז׳בוטינסקי 50, רמת גן', lat: 32.0858, lng: 34.8099 },
    { address: 'כצנלסון 60, גבעתיים', lat: 32.0715, lng: 34.8103 },
    { address: 'בורוכוב 7, גבעתיים', lat: 32.0701, lng: 34.8121 },
    { address: 'אבן גבירול 70, תל אביב', lat: 32.0817, lng: 34.7818 },
    { address: 'הנרייטה סולד 6, חולון', lat: 32.0239494, lng: 34.769901 },
  ],
  'ירושלים': [
    { address: 'קינג ג׳ורג׳ 23, ירושלים', lat: 31.7807542, lng: 35.2160268 },
    { address: 'יפו 30, ירושלים', lat: 31.7806913, lng: 35.2218463 },
    { address: 'המלך דוד 9, ירושלים', lat: 31.7765403, lng: 35.2223418 },
    { address: 'הזית 21, מודיעין', lat: 31.9169591, lng: 35.0343183 },
    { address: 'הברושים 11, מודיעין', lat: 31.8795665, lng: 35.0069308 },
    { address: 'הנביאים 5, ירושלים', lat: 31.7835315, lng: 35.2260726 },
    { address: 'דרך בן גוריון 4, שוהם', lat: 31.9527, lng: 34.9471 },
    { address: 'הגפן 8, גוש עציון', lat: 31.6553, lng: 35.1225 },
    { address: 'עזה 12, ירושלים', lat: 31.7738298, lng: 35.2161192 },
    { address: 'דרך בית לחם 7, ירושלים', lat: 31.7634065, lng: 35.2241629 },
  ],
  'גוש דן': [
    { address: 'ז׳בוטינסקי 40, פתח תקווה', lat: 32.0669594, lng: 34.8539374 },
    { address: 'התמר 4, ראש העין', lat: 32.0954849, lng: 34.9625264 },
    { address: 'אחד העם 30, פתח תקווה', lat: 32.0842032, lng: 34.8890059 },
    { address: 'רוטשילד 5, פתח תקווה', lat: 32.095131, lng: 34.880346 },
    { address: 'הרצל 18, ראש העין', lat: 32.0941438, lng: 34.946698 },
    { address: 'סטמפר 12, פתח תקווה', lat: 32.0901526, lng: 34.8857594 },
    { address: 'ויצמן 5, קריית אונו', lat: 32.0578, lng: 34.8552 },
    { address: 'הרצל 22, קריית אונו', lat: 32.0563, lng: 34.8571 },
    { address: 'המייסדים 10, יהוד', lat: 32.0328, lng: 34.8876 },
    { address: 'הנשיא 3, יהוד', lat: 32.0341, lng: 34.8862 },
  ],
  'השרון': [
    { address: 'סוקולוב 18, הרצליה', lat: 32.1670829, lng: 34.8414092 },
    { address: 'אוסישקין 27, רעננה', lat: 32.1613122, lng: 34.8487334 },
    { address: 'יצחק רבין 13, הוד השרון', lat: 32.0660246, lng: 34.8662571 },
    { address: 'הברוש 8, רמת השרון', lat: 32.1473037, lng: 34.842308 },
    { address: 'שד׳ בן ציון 9, הרצליה', lat: 32.073585, lng: 34.7765811 },
    { address: 'שדרות הנשיא 20, רעננה', lat: 32.1972943, lng: 34.8732006 },
    { address: 'אחוזה 45, רעננה', lat: 32.178261, lng: 34.8835049 },
    { address: 'המייסדים 6, הוד השרון', lat: 32.1408919, lng: 34.8840215 },
    { address: 'ויצמן 22, כפר סבא', lat: 32.1773265, lng: 34.8987445 },
    { address: 'בן גוריון 10, צפון תל אביב', lat: 32.1153, lng: 34.7943 },
  ],
  'נתניה': [
    { address: 'הגליל 7, נתניה', lat: 32.3251795, lng: 34.8546258 },
    { address: 'שד׳ בנימין 10, נתניה', lat: 32.326743, lng: 34.857448 },
    { address: 'הנשיא 8, נתניה', lat: 32.3382759, lng: 34.8554604 },
    { address: 'ויצמן 15, נתניה', lat: 32.3165846, lng: 34.9264873 },
    { address: 'גורדון 6, נתניה', lat: 32.3301982, lng: 34.8580343 },
    { address: 'הרצליה 18, נתניה', lat: 32.1881509, lng: 34.8111168 },
    { address: 'השרון 5, קדימה צורן', lat: 32.2783, lng: 34.9166 },
    { address: 'הדקל 12, קדימה צורן', lat: 32.2801, lng: 34.9188 },
    { address: 'העמק 8, עמק חפר', lat: 32.3546, lng: 34.9012 },
    { address: 'הגפן 3, עמק חפר', lat: 32.3502, lng: 34.8985 },
  ],
  'צפון קרוב': [
    { address: 'העליה 20, חדרה', lat: 32.4753019, lng: 34.9994917 },
    { address: 'רזיאל 25, חדרה', lat: 32.7511443, lng: 34.9701662 },
    { address: 'הרצל 40, חדרה', lat: 32.4385978, lng: 34.9197665 },
    { address: 'סמילנסקי 12, חדרה', lat: 32.4341785, lng: 34.9141615 },
    { address: 'הנשיא 5, בנימינה', lat: 32.5186, lng: 34.9447 },
    { address: 'הרצל 10, פרדס חנה', lat: 32.4711, lng: 34.9664 },
    { address: 'הים 15, קיסריה', lat: 32.5021, lng: 34.8877 },
    { address: 'שד׳ רוטשילד 8, קיסריה', lat: 32.4988, lng: 34.8912 },
    { address: 'הגפן 3, חריש', lat: 32.4566, lng: 35.0447 },
    { address: 'השקד 7, חריש', lat: 32.4589, lng: 35.0462 },
  ],
  'צפון רחוק': [
    { address: 'בן יהודה 8, חיפה', lat: 32.8100482, lng: 34.9941958 },
    { address: 'שד׳ הנשיא 15, חיפה', lat: 32.8145624, lng: 34.979502 },
    { address: 'העצמאות 33, חיפה', lat: 32.8188172, lng: 35.000065 },
    { address: 'הגליל 12, נהריה', lat: 33.0085361, lng: 35.0980514 },
    { address: 'הרצל 15, צפת', lat: 32.9579582, lng: 35.4963572 },
    { address: 'האלון 9, כרמיאל', lat: 32.9132211, lng: 35.3073001 },
    { address: 'הנדיב 5, זיכרון יעקב', lat: 32.5715, lng: 34.9531 },
    { address: 'המייסדים 8, זיכרון יעקב', lat: 32.5701, lng: 34.9548 },
    { address: 'הגפן 4, בית רימון', lat: 32.7893, lng: 35.3802 },
    { address: 'הזית 11, קריית שמונה', lat: 33.20809, lng: 35.5699622 },
  ],
  'שומרון': [
    { address: 'הרצל 10, אריאל', lat: 32.1056, lng: 35.1745 },
    { address: 'שד׳ רבין 5, אריאל', lat: 32.1042, lng: 35.1762 },
    { address: 'הגפן 3, קרני שומרון', lat: 32.1748, lng: 35.0932 },
    { address: 'התאנה 8, אלקנה', lat: 32.1102, lng: 35.0345 },
    { address: 'הזית 12, עמנואל', lat: 32.1571, lng: 35.1478 },
    { address: 'השקד 7, קדומים', lat: 32.1916, lng: 35.1499 },
    { address: 'הדקל 4, אלפי מנשה', lat: 32.1632, lng: 35.0622 },
    { address: 'הברוש 9, בית אריה', lat: 32.0437, lng: 35.0712 },
    { address: 'האלון 6, ברקן', lat: 32.1195, lng: 35.1243 },
    { address: 'הרימון 2, שערי תקווה', lat: 32.1334, lng: 35.0493 },
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

// Generate customers spread across 9 regions
function generateCustomers(): Customer[] {
  const result: Customer[] = [];
  const regionCount = CITIES.length; // 9
  for (let i = 0; i < 1200; i++) {
    const month = Math.floor(i / 100) + 1; // 100 per month
    const cityIdx = i % regionCount;
    const city = CITIES[cityIdx];
    const addressEntry = ADDRESSES[city][Math.floor(i / regionCount) % ADDRESSES[city].length];
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

// No mock jobs — real data comes from CSV and user input
export const initialJobs: Job[] = [];
