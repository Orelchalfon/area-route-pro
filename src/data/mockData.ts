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
    { address: 'דרך העצמאות 50, באר שבע', lat: 31.2402129, lng: 34.7900568 },
    { address: 'ההסתדרות 8, באר שבע', lat: 31.2374429, lng: 34.7869685 },
    { address: 'הדקל 7, אילת', lat: 29.56471, lng: 34.947531 },
    { address: 'שד׳ הנגב 12, דימונה', lat: 31.069419, lng: 35.033363 },
    { address: 'רגר 5, באר שבע', lat: 31.244835, lng: 34.795244 },
    { address: 'הנשיא 3, ערד', lat: 31.6735753, lng: 34.5687551 },
    { address: 'יצחק רבין 10, אופקים', lat: 31.7827667, lng: 35.2041994 },
    { address: 'הפלמ״ח 22, באר שבע', lat: 31.2383043, lng: 34.7902319 },
    { address: 'העצמאות 14, ירוחם', lat: 31.2385546, lng: 34.7924147 },
    { address: 'הרצל 8, מצפה רמון', lat: 30.6094096, lng: 34.8011766 },
  ],
  'דרום קרוב': [
    { address: 'דרך הים 10, אשדוד', lat: 31.804381, lng: 34.655314 },
    { address: 'ירושלים 55, אשקלון', lat: 31.6687885, lng: 34.5742523 },
    { address: 'השקד 2, יבנה', lat: 31.8757953, lng: 34.7390727 },
    { address: 'דרך הים 45, אשדוד', lat: 31.8943719, lng: 34.7936229 },
    { address: 'הגפן 15, קריית גת', lat: 31.6064195, lng: 34.7721155 },
    { address: 'שד׳ הנשיא 7, אשדוד', lat: 31.7978059, lng: 34.6560212 },
    { address: 'הזית 3, יבנה', lat: 31.8771383, lng: 34.7388138 },
    { address: 'בן גוריון 20, אשקלון', lat: 32.1633518, lng: 34.8423664 },
    { address: 'העצמאות 30, קריית מלאכי', lat: 31.7914766, lng: 34.6445257 },
    { address: 'הברוש 11, גדרה', lat: 31.8060331, lng: 34.7859814 },
  ],
  'דרום ת״א והסביבה': [
    { address: 'שמואל הנגיד 11, ראשון לציון', lat: 31.9957441, lng: 34.7507542 },
    { address: 'הנרייטה סולד 6, חולון', lat: 32.0239494, lng: 34.769901 },
    { address: 'יוספטל 33, בת ים', lat: 32.0173973, lng: 34.7451343 },
    { address: 'כצנלסון 35, בת ים', lat: 32.0216205, lng: 34.7545495 },
    { address: 'הפרחים 12, נס ציונה', lat: 31.932111, lng: 34.801327 },
    { address: 'סמילנסקי 7, חולון', lat: 31.9591751, lng: 34.8054848 },
    { address: 'רוטשילד 14, ראשון לציון', lat: 31.9643384, lng: 34.8054383 },
    { address: 'הרצל 28, חולון', lat: 32.0603111, lng: 34.7704667 },
    { address: 'ז׳בוטינסקי 15, ראשון לציון', lat: 31.9599567, lng: 34.8010528 },
    { address: 'הבנים 9, נס ציונה', lat: 31.9297024, lng: 34.8002699 },
  ],
  'ירושלים והסביבה': [
    { address: 'קינג ג׳ורג׳ 23, ירושלים', lat: 31.7807542, lng: 35.2160268 },
    { address: 'יפו 30, ירושלים', lat: 31.7806913, lng: 35.2218463 },
    { address: 'המלך דוד 9, ירושלים', lat: 31.7765403, lng: 35.2223418 },
    { address: 'הזית 21, מודיעין', lat: 31.9169591, lng: 35.0343183 },
    { address: 'הנביאים 5, ירושלים', lat: 31.7835315, lng: 35.2260726 },
    { address: 'קרן היסוד 16, ירושלים', lat: 31.7732534, lng: 35.2197794 },
    { address: 'הברושים 11, מודיעין', lat: 31.8795665, lng: 35.0069308 },
    { address: 'בן יהודה 40, ירושלים', lat: 31.7809492, lng: 35.2145696 },
    { address: 'עזה 12, ירושלים', lat: 31.7738298, lng: 35.2161192 },
    { address: 'דרך בית לחם 7, ירושלים', lat: 31.7634065, lng: 35.2241629 },
  ],
  'מרכז - פתח תקווה': [
    { address: 'ז׳בוטינסקי 40, פתח תקווה', lat: 32.0669594, lng: 34.8539374 },
    { address: 'התמר 4, ראש העין', lat: 32.0954849, lng: 34.9625264 },
    { address: 'דרך בן גוריון 31, רמלה', lat: 31.931566, lng: 34.872938 },
    { address: 'שד׳ ירושלים 44, לוד', lat: 31.951014, lng: 34.888075 },
    { address: 'אחד העם 30, פתח תקווה', lat: 32.0842032, lng: 34.8890059 },
    { address: 'רוטשילד 5, פתח תקווה', lat: 32.095131, lng: 34.880346 },
    { address: 'הרצל 18, ראש העין', lat: 32.0941438, lng: 34.946698 },
    { address: 'סטמפר 12, פתח תקווה', lat: 32.0901526, lng: 34.8857594 },
    { address: 'בילו 8, רמלה', lat: 31.9419658, lng: 34.8820903 },
    { address: 'העצמאות 25, לוד', lat: 32.028633, lng: 34.863694 },
  ],
  'הרצליה, רעננה והסביבה': [
    { address: 'סוקולוב 18, הרצליה', lat: 32.1670829, lng: 34.8414092 },
    { address: 'ויצמן 22, כפר סבא', lat: 32.1773265, lng: 34.8987445 },
    { address: 'אוסישקין 27, רעננה', lat: 32.1613122, lng: 34.8487334 },
    { address: 'יצחק רבין 13, הוד השרון', lat: 32.0660246, lng: 34.8662571 },
    { address: 'הברוש 8, רמת השרון', lat: 32.1473037, lng: 34.842308 },
    { address: 'שד׳ בן ציון 9, הרצליה', lat: 32.073585, lng: 34.7765811 },
    { address: 'שדרות הנשיא 20, רעננה', lat: 32.1972943, lng: 34.8732006 },
    { address: 'אחוזה 45, רעננה', lat: 32.178261, lng: 34.8835049 },
    { address: 'הרצל 33, כפר סבא', lat: 32.1725769, lng: 34.9103775 },
    { address: 'המייסדים 6, הוד השרון', lat: 32.1408919, lng: 34.8840215 },
  ],
  'שומרון': [
    { address: 'המייסדים 17, עפולה', lat: 32.6094875, lng: 35.2756128 },
    { address: 'הגלבוע 14, עפולה', lat: 32.6013726, lng: 35.2919554 },
    { address: 'הרצל 8, אריאל', lat: 32.1046376, lng: 35.1745145 },
    { address: 'העצמאות 12, קדומים', lat: 32.3209611, lng: 34.9274554 },
    { address: 'הזית 5, אלפי מנשה', lat: 32.17683, lng: 35.0183364 },
    { address: 'דרך השלום 3, עפולה', lat: 32.6265258, lng: 35.3265557 },
    { address: 'הגפן 7, אריאל', lat: 31.6066815, lng: 34.7706425 },
    { address: 'הדקל 9, אלקנה', lat: 31.8057744, lng: 34.6403668 },
    { address: 'בן גוריון 15, עפולה', lat: 32.610493, lng: 35.287922 },
    { address: 'הרימון 4, ברקן', lat: 32.105559, lng: 35.106973 },
  ],
  'נתניה, עמק חפר': [
    { address: 'הגליל 7, נתניה', lat: 32.3251795, lng: 34.8546258 },
    { address: 'העליה 20, חדרה', lat: 32.4753019, lng: 34.9994917 },
    { address: 'הרצליה 18, נתניה', lat: 32.1881509, lng: 34.8111168 },
    { address: 'שד׳ בנימין 10, נתניה', lat: 32.326743, lng: 34.857448 },
    { address: 'רזיאל 25, חדרה', lat: 32.7511443, lng: 34.9701662 },
    { address: 'הנשיא 8, נתניה', lat: 32.3382759, lng: 34.8554604 },
    { address: 'הרצל 40, חדרה', lat: 32.4385978, lng: 34.9197665 },
    { address: 'ויצמן 15, נתניה', lat: 32.3165846, lng: 34.9264873 },
    { address: 'סמילנסקי 12, חדרה', lat: 32.4341785, lng: 34.9141615 },
    { address: 'גורדון 6, נתניה', lat: 32.3301982, lng: 34.8580343 },
  ],
  'צפון קרוב': [
    { address: 'בן יהודה 8, חיפה', lat: 32.8100482, lng: 34.9941958 },
    { address: 'שד׳ הנשיא 15, חיפה', lat: 32.8145624, lng: 34.979502 },
    { address: 'העצמאות 33, חיפה', lat: 32.8188172, lng: 35.000065 },
    { address: 'הרצל 60, נצרת עילית', lat: 32.6892246, lng: 35.3026479 },
    { address: 'האלון 9, כרמיאל', lat: 32.9132211, lng: 35.3073001 },
    { address: 'התאנה 15, קריית מוצקין', lat: 32.8553301, lng: 35.0718781 },
    { address: 'הרימון 3, קריית ביאליק', lat: 32.8273289, lng: 35.0855828 },
    { address: 'העצמאות 22, עכו', lat: 32.9294736, lng: 35.0724717 },
    { address: 'המגינים 10, חיפה', lat: 32.8178121, lng: 34.9991944 },
    { address: 'הנביאים 18, חיפה', lat: 32.8135839, lng: 34.9954973 },
  ],
  'צפון רחוק': [
    { address: 'הגפן 24, טבריה', lat: 32.781485, lng: 35.523647 },
    { address: 'רמב״ם 4, טבריה', lat: 32.780748, lng: 35.537235 },
    { address: 'הרצל 15, צפת', lat: 32.9579582, lng: 35.4963572 },
    { address: 'העצמאות 8, קריית שמונה', lat: 33.20809, lng: 35.5699622 },
    { address: 'הגליל 12, נהריה', lat: 33.0085361, lng: 35.0980514 },
    { address: 'דרך הים 5, נהריה', lat: 32.8039895, lng: 34.9865259 },
    { address: 'הרצל 20, צפת', lat: 32.9579703, lng: 35.4961069 },
    { address: 'המייסדים 3, ראש פינה', lat: 33.0557966, lng: 35.6051309 },
    { address: 'הגפן 7, מגדל', lat: 32.676237, lng: 35.232085 },
    { address: 'הזית 11, קריית שמונה', lat: 33.20809, lng: 35.5699622 },
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
