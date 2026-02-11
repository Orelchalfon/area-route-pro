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

const ADDRESSES: Record<string, string[]> = {
  'דרום רחוק': ['דרך העצמאות 50, באר שבע', 'ההסתדרות 8, באר שבע', 'הדקל 7, אילת', 'שד׳ הנגב 12, דימונה', 'רגר 5, באר שבע', 'הנשיא 3, ערד', 'יצחק רבין 10, אופקים', 'הפלמ״ח 22, באר שבע', 'העצמאות 14, ירוחם', 'הרצל 8, מצפה רמון'],
  'דרום קרוב': ['דרך הים 10, אשדוד', 'ירושלים 55, אשקלון', 'השקד 2, יבנה', 'דרך הים 45, אשדוד', 'הגפן 15, קריית גת', 'שד׳ הנשיא 7, אשדוד', 'הזית 3, יבנה', 'בן גוריון 20, אשקלון', 'העצמאות 30, קריית מלאכי', 'הברוש 11, גדרה'],
  'דרום ת״א והסביבה': ['שמואל הנגיד 11, ראשון לציון', 'הנרייטה סולד 6, חולון', 'יוספטל 33, בת ים', 'כצנלסון 35, בת ים', 'הפרחים 12, נס ציונה', 'סמילנסקי 7, חולון', 'רוטשילד 14, ראשון לציון', 'הרצל 28, חולון', 'ז׳בוטינסקי 15, ראשון לציון', 'הבנים 9, נס ציונה'],
  'ירושלים והסביבה': ['קינג ג׳ורג׳ 23, ירושלים', 'יפו 30, ירושלים', 'המלך דוד 9, ירושלים', 'הזית 21, מודיעין', 'הנביאים 5, ירושלים', 'קרן היסוד 16, ירושלים', 'הברושים 11, מודיעין', 'בן יהודה 40, ירושלים', 'עזה 12, ירושלים', 'דרך בית לחם 7, ירושלים'],
  'מרכז - פתח תקווה': ['ז׳בוטינסקי 40, פתח תקווה', 'התמר 4, ראש העין', 'דרך בן גוריון 31, רמלה', 'שד׳ ירושלים 44, לוד', 'אחד העם 30, פתח תקווה', 'רוטשילד 5, פתח תקווה', 'הרצל 18, ראש העין', 'סטמפר 12, פתח תקווה', 'בילו 8, רמלה', 'העצמאות 25, לוד'],
  'הרצליה, רעננה והסביבה': ['סוקולוב 18, הרצליה', 'ויצמן 22, כפר סבא', 'אוסישקין 27, רעננה', 'יצחק רבין 13, הוד השרון', 'הברוש 8, רמת השרון', 'שד׳ בן ציון 9, הרצליה', 'שדרות הנשיא 20, רעננה', 'אחוזה 45, רעננה', 'הרצל 33, כפר סבא', 'המייסדים 6, הוד השרון'],
  'שומרון': ['המייסדים 17, עפולה', 'הגלבוע 14, עפולה', 'הרצל 8, אריאל', 'העצמאות 12, קדומים', 'הזית 5, אלפי מנשה', 'דרך השלום 3, עפולה', 'הגפן 7, אריאל', 'הדקל 9, אלקנה', 'בן גוריון 15, עפולה', 'הרימון 4, ברקן'],
  'נתניה, עמק חפר': ['הגליל 7, נתניה', 'העליה 20, חדרה', 'הרצליה 18, נתניה', 'שד׳ בנימין 10, נתניה', 'רזיאל 25, חדרה', 'הנשיא 8, נתניה', 'הרצל 40, חדרה', 'ויצמן 15, נתניה', 'סמילנסקי 12, חדרה', 'גורדון 6, נתניה'],
  'צפון קרוב': ['בן יהודה 8, חיפה', 'שד׳ הנשיא 15, חיפה', 'העצמאות 33, חיפה', 'הרצל 60, נצרת עילית', 'האלון 9, כרמיאל', 'התאנה 15, קריית מוצקין', 'הרימון 3, קריית ביאליק', 'העצמאות 22, עכו', 'המגינים 10, חיפה', 'הנביאים 18, חיפה'],
  'צפון רחוק': ['הגפן 24, טבריה', 'רמב״ם 4, טבריה', 'הרצל 15, צפת', 'העצמאות 8, קריית שמונה', 'הגליל 12, נהריה', 'דרך הים 5, נהריה', 'הרצל 20, צפת', 'המייסדים 3, ראש פינה', 'הגפן 7, מגדל', 'הזית 11, קריית שמונה'],
};

const FIRST_NAMES = ['שרה', 'מיכאל', 'רחל', 'דניאל', 'תמר', 'אייל', 'נועה', 'אורן', 'יעל', 'אבי', 'מורן', 'עידו', 'ליאת', 'רון', 'הדר', 'אלון', 'שירה', 'גיל', 'ענת', 'נדב', 'מיכל', 'יונתן', 'אורלי', 'דור', 'קרן', 'תומר', 'נעמי', 'עמיר', 'רותם', 'איתי', 'סיון', 'אלעד', 'ליאור', 'עדי', 'שחר', 'דנה', 'ניר', 'מעיין', 'עופר', 'טלי', 'ארז', 'הילה', 'בועז', 'שני', 'אריאל', 'יפית', 'אסף', 'מאיה', 'גלעד', 'רינת'];
const LAST_NAMES = ['גולדשטיין', 'רובין', 'מזרחי', 'פרץ', 'אברהמי', 'כץ', 'פרידמן', 'שוורץ', 'דהן', 'מלכה', 'ביטון', 'נחמיאס', 'שמעון', 'אזולאי', 'לביא', 'סגל', 'קפלן', 'חסון', 'ברק', 'עמרם', 'אופיר', 'גרינברג', 'טל', 'אשכנזי', 'וולף', 'שלום', 'הלל', 'צור', 'חן', 'מנדל', 'רוזנפלד', 'פינקלשטיין', 'הרשקוביץ', 'שפירו', 'נאמן', 'קורן', 'אדלר', 'זיו', 'רוזנברג', 'גולן', 'חביב', 'לוין', 'פלד', 'אלקובי', 'מאירי', 'אוחיון', 'דיין', 'כהן', 'שמש', 'אלפסי'];

// Generate 1200 customers — 100 per month, spread across 10 regions
function generateCustomers(): Customer[] {
  const result: Customer[] = [];
  for (let i = 0; i < 1200; i++) {
    const month = Math.floor(i / 100) + 1; // 100 per month
    const cityIdx = i % 10;
    const city = CITIES[cityIdx];
    const addressIdx = Math.floor(i / 10) % ADDRESSES[city].length;
    const address = ADDRESSES[city][addressIdx];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const product = PRODUCTS[i % PRODUCTS.length];

    result.push({
      id: `c${i + 1}`,
      name: `${firstName} ${lastName}`,
      phone: `+972-5${i % 5}-${String(1000000 + i).slice(-7)}`,
      address,
      city,
      email: `${firstName.toLowerCase()}${i}@email.com`,
      product,
      filterReplacementMonth: month,
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
