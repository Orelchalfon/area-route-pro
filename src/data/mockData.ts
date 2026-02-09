import { Technician, Customer, Job } from '@/types';

export const technicians: Technician[] = [
  { id: 't1', name: 'דוד כהן', region: 'מרכז', skills: ['פילטרים', 'התקנות', 'תקלות'], phone: '+972-50-1234567' },
  { id: 't2', name: 'יוסי לוי', region: 'צפון', skills: ['פילטרים', 'תקלות', 'התקנות'], phone: '+972-52-2345678' },
];

export const customers: Customer[] = [
  { id: 'c1', name: 'שרה גולדשטיין', phone: '+972-50-1111111', address: 'רוטשילד 12', city: 'תל אביב', email: 'sara@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c2', name: 'מיכאל רובין', phone: '+972-52-2222222', address: 'הרצל 45', city: 'תל אביב', email: 'michael@email.com', product: 'בר מים Eden' },
  { id: 'c3', name: 'רחל מזרחי', phone: '+972-54-3333333', address: 'בן יהודה 8', city: 'חיפה', email: 'rachel@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c4', name: 'דניאל פרץ', phone: '+972-50-4444444', address: 'קינג ג׳ורג׳ 23', city: 'ירושלים', email: 'daniel@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c5', name: 'תמר אברהמי', phone: '+972-52-5555555', address: 'דיזנגוף 67', city: 'תל אביב', email: 'tamar@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c6', name: 'אייל כץ', phone: '+972-54-6666666', address: 'שד׳ הנשיא 15', city: 'חיפה', email: 'eyal@email.com', product: 'בר מים תמי4' },
  { id: 'c7', name: 'נועה פרידמן', phone: '+972-50-7777777', address: 'יפו 30', city: 'ירושלים', email: 'noa@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c8', name: 'אורן שוורץ', phone: '+972-52-8888888', address: 'אלנבי 5', city: 'תל אביב', email: 'oren@email.com', product: 'בר מים Eden' },
  { id: 'c9', name: 'יעל דהן', phone: '+972-50-9999901', address: 'ביאליק 3', city: 'רמת גן', email: 'yael@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c10', name: 'אבי מלכה', phone: '+972-52-9999902', address: 'סוקולוב 18', city: 'הרצליה', email: 'avi@email.com', product: 'בר מים תמי4' },
  { id: 'c11', name: 'מורן ביטון', phone: '+972-54-9999903', address: 'ויצמן 22', city: 'כפר סבא', email: 'moran@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c12', name: 'עידו נחמיאס', phone: '+972-50-9999904', address: 'ז׳בוטינסקי 40', city: 'פתח תקווה', email: 'ido@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c13', name: 'ליאת שמעון', phone: '+972-52-9999905', address: 'הגליל 7', city: 'נתניה', email: 'liat@email.com', product: 'בר מים Eden' },
  { id: 'c14', name: 'רון אזולאי', phone: '+972-54-9999906', address: 'המלך דוד 9', city: 'ירושלים', email: 'ron@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c15', name: 'הדר לביא', phone: '+972-50-9999907', address: 'נורדאו 14', city: 'תל אביב', email: 'hadar@email.com', product: 'בר מים תמי4' },
  { id: 'c16', name: 'אלון סגל', phone: '+972-52-9999908', address: 'העצמאות 33', city: 'חיפה', email: 'alon@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c17', name: 'שירה קפלן', phone: '+972-54-9999909', address: 'הרב קוק 5', city: 'בני ברק', email: 'shira@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c18', name: 'גיל חסון', phone: '+972-50-9999910', address: 'שמואל הנגיד 11', city: 'ראשון לציון', email: 'gil@email.com', product: 'בר מים Eden' },
  { id: 'c19', name: 'ענת ברק', phone: '+972-52-9999911', address: 'אוסישקין 27', city: 'רעננה', email: 'anat@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c20', name: 'נדב עמרם', phone: '+972-54-9999912', address: 'הנרייטה סולד 6', city: 'חולון', email: 'nadav@email.com', product: 'בר מים תמי4' },
  { id: 'c21', name: 'מיכל אופיר', phone: '+972-50-9999913', address: 'דרך העצמאות 50', city: 'באר שבע', email: 'michal@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c22', name: 'יונתן גרינברג', phone: '+972-52-9999914', address: 'בורוכוב 19', city: 'גבעתיים', email: 'yonatan@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c23', name: 'אורלי טל', phone: '+972-54-9999915', address: 'מנחם בגין 88', city: 'תל אביב', email: 'orly@email.com', product: 'בר מים Eden' },
  { id: 'c24', name: 'דור אשכנזי', phone: '+972-50-9999916', address: 'התמר 4', city: 'ראש העין', email: 'dor@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c25', name: 'קרן וולף', phone: '+972-52-9999917', address: 'הזית 21', city: 'מודיעין', email: 'keren@email.com', product: 'בר מים תמי4' },
  { id: 'c26', name: 'תומר שלום', phone: '+972-54-9999918', address: 'דרך הים 10', city: 'אשדוד', email: 'tomer@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c27', name: 'נעמי הלל', phone: '+972-50-9999919', address: 'ירושלים 55', city: 'אשקלון', email: 'naomi@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c28', name: 'עמיר צור', phone: '+972-52-9999920', address: 'יצחק רבין 13', city: 'הוד השרון', email: 'amir@email.com', product: 'בר מים Eden' },
  { id: 'c29', name: 'רותם חן', phone: '+972-54-9999921', address: 'הברוש 8', city: 'רמת השרון', email: 'rotem@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c30', name: 'איתי מנדל', phone: '+972-50-9999922', address: 'ההדסים 16', city: 'קריית אונו', email: 'itay@email.com', product: 'בר מים תמי4' },
  { id: 'c31', name: 'סיון רוזנפלד', phone: '+972-52-9999923', address: 'השקד 2', city: 'יבנה', email: 'sivan@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c32', name: 'אלעד פינקלשטיין', phone: '+972-54-9999924', address: 'דרך בן גוריון 31', city: 'רמלה', email: 'elad@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c33', name: 'ליאור הרשקוביץ', phone: '+972-50-9999925', address: 'האלון 9', city: 'כרמיאל', email: 'lior@email.com', product: 'בר מים Eden' },
  { id: 'c34', name: 'עדי שפירו', phone: '+972-52-9999926', address: 'הגפן 24', city: 'טבריה', email: 'adi@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c35', name: 'שחר נאמן', phone: '+972-54-9999927', address: 'המייסדים 17', city: 'עפולה', email: 'shahar@email.com', product: 'בר מים תמי4' },
  { id: 'c36', name: 'דנה קורן', phone: '+972-50-9999928', address: 'הרצל 60', city: 'נצרת עילית', email: 'dana@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c37', name: 'ניר אדלר', phone: '+972-52-9999929', address: 'שד׳ ירושלים 44', city: 'לוד', email: 'nir@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c38', name: 'מעיין זיו', phone: '+972-54-9999930', address: 'הדקל 7', city: 'אילת', email: 'maayan@email.com', product: 'בר מים Eden' },
  { id: 'c39', name: 'עופר רוזנברג', phone: '+972-50-9999931', address: 'כצנלסון 35', city: 'בת ים', email: 'ofer@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c40', name: 'טלי גולן', phone: '+972-52-9999932', address: 'הפרחים 12', city: 'נס ציונה', email: 'tali@email.com', product: 'בר מים תמי4' },
  { id: 'c41', name: 'ארז חביב', phone: '+972-54-9999933', address: 'דרך יפו 77', city: 'תל אביב', email: 'erez@email.com', product: 'מסנן ברז ביתי' },
  { id: 'c42', name: 'הילה לוין', phone: '+972-50-9999934', address: 'העליה 20', city: 'חדרה', email: 'hila@email.com', product: 'מערכת סינון מרכזית' },
  { id: 'c43', name: 'בועז פלד', phone: '+972-52-9999935', address: 'הרימון 3', city: 'קריית ביאליק', email: 'boaz@email.com', product: 'בר מים Eden' },
  { id: 'c44', name: 'שני אלקובי', phone: '+972-54-9999936', address: 'התאנה 15', city: 'קריית מוצקין', email: 'shani@email.com', product: 'מערכת אוסמוזה 5 שלבים' },
  { id: 'c45', name: 'אריאל מאירי', phone: '+972-50-9999937', address: 'ברנר 28', city: 'גבעת שמואל', email: 'ariel@email.com', product: 'בר מים תמי4' },
];

// Helper to get dates relative to today (skip Fri/Sat)
const today = new Date();
const getWorkday = (offset: number): string => {
  let count = 0;
  let d = new Date(today);
  const dir = offset >= 0 ? 1 : -1;
  while (count < Math.abs(offset)) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 5 && dow !== 6) count++;
  }
  return d.toISOString().split('T')[0];
};
const fmt = (offset: number) => getWorkday(offset);
const todayStr = today.toISOString().split('T')[0];

export const initialJobs: Job[] = [
  // ========== היום (יום 0) ==========
  // --- דוד כהן (t1) ---
  { id: 'j1',  type: 'filter_replacement', status: 'confirmed', priority: 'low',    customerId: 'c1',  technicianId: 't1', scheduledDate: todayStr, scheduledTime: '08:00', estimatedDuration: 25, location: 'רוטשילד 12',      city: 'תל אביב',     notes: 'החלפת פילטר שנתית',       createdAt: fmt(-1) },
  { id: 'j2',  type: 'filter_replacement', status: 'confirmed', priority: 'low',    customerId: 'c9',  technicianId: 't1', scheduledDate: todayStr, scheduledTime: '08:30', estimatedDuration: 25, location: 'ביאליק 3',         city: 'רמת גן',       notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j3',  type: 'malfunction',       status: 'confirmed', priority: 'high',   customerId: 'c2',  technicianId: 't1', scheduledDate: todayStr, scheduledTime: '09:00', estimatedDuration: 60, location: 'הרצל 45',          city: 'תל אביב',     notes: 'אין מים קרים - דחוף',      createdAt: fmt(-1) },
  { id: 'j4',  type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c15', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '10:00', estimatedDuration: 120, location: 'נורדאו 14',        city: 'תל אביב',     notes: 'התקנת בר מים תמי4',        createdAt: fmt(-2) },
  { id: 'j5',  type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c22', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '12:00', estimatedDuration: 25, location: 'בורוכוב 19',       city: 'גבעתיים',     notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j6',  type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c10', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '12:30', estimatedDuration: 60, location: 'סוקולוב 18',       city: 'הרצליה',      notes: 'תקלה בחימום',              createdAt: fmt(-1) },
  { id: 'j7',  type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c19', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '13:30', estimatedDuration: 25, location: 'אוסישקין 27',      city: 'רעננה',       notes: 'החלפה שנתית',              createdAt: fmt(-1) },
  { id: 'j8',  type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c24', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '14:00', estimatedDuration: 120, location: 'התמר 4',           city: 'ראש העין',    notes: 'התקנת מערכת אוסמוזה',      createdAt: fmt(-1) },
  { id: 'j9',  type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c29', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '16:00', estimatedDuration: 25, location: 'הברוש 8',          city: 'רמת השרון',   notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j10', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c30', technicianId: 't1', scheduledDate: todayStr, scheduledTime: '16:30', estimatedDuration: 25, location: 'ההדסים 16',        city: 'קריית אונו',  notes: 'טיפול שנתי',               createdAt: fmt(-1) },

  // --- יוסי לוי (t2) ---
  { id: 'j11', type: 'malfunction',       status: 'confirmed', priority: 'high',   customerId: 'c3',  technicianId: 't2', scheduledDate: todayStr, scheduledTime: '08:00', estimatedDuration: 60, location: 'בן יהודה 8',       city: 'חיפה',        notes: 'נזילה ביחידה',             createdAt: fmt(-1) },
  { id: 'j12', type: 'filter_replacement', status: 'confirmed', priority: 'low',    customerId: 'c6',  technicianId: 't2', scheduledDate: todayStr, scheduledTime: '09:00', estimatedDuration: 25, location: 'שד׳ הנשיא 15',    city: 'חיפה',        notes: 'טיפול שנתי',               createdAt: fmt(-2) },
  { id: 'j13', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c16', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '09:30', estimatedDuration: 25, location: 'העצמאות 33',       city: 'חיפה',        notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j14', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c33', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '10:00', estimatedDuration: 120, location: 'האלון 9',          city: 'כרמיאל',      notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j15', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c34', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '12:00', estimatedDuration: 60, location: 'הגפן 24',          city: 'טבריה',       notes: 'תקלה במשאבה',              createdAt: fmt(-1) },
  { id: 'j16', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c35', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '13:00', estimatedDuration: 25, location: 'המייסדים 17',      city: 'עפולה',       notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j17', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c36', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '13:30', estimatedDuration: 25, location: 'הרצל 60',          city: 'נצרת עילית', notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j18', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c44', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '14:00', estimatedDuration: 120, location: 'התאנה 15',         city: 'קריית מוצקין',notes: 'התקנת מערכת סינון',        createdAt: fmt(-1) },
  { id: 'j19', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c43', technicianId: 't2', scheduledDate: todayStr, scheduledTime: '16:00', estimatedDuration: 60, location: 'הרימון 3',         city: 'קריית ביאליק',notes: 'רעש חריג',                 createdAt: fmt(-1) },

  // ========== יום 1 (מחר) ==========
  // --- דוד כהן (t1) ---
  { id: 'j20', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c5',  technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '08:00', estimatedDuration: 120, location: 'דיזנגוף 67',       city: 'תל אביב',     notes: 'מערכת אוסמוזה 5 שלבים',    createdAt: fmt(-2) },
  { id: 'j21', type: 'malfunction',       status: 'pending_customer', priority: 'high', customerId: 'c11', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '10:00', estimatedDuration: 60, location: 'ויצמן 22',    city: 'כפר סבא',     notes: 'רעש חריג מהמערכת',         createdAt: fmt(-1) },
  { id: 'j22', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c8',  technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '11:00', estimatedDuration: 25, location: 'אלנבי 5',          city: 'תל אביב',     notes: 'החלפה שגרתית',             createdAt: fmt(-3) },
  { id: 'j23', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c12', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '11:30', estimatedDuration: 25, location: 'ז׳בוטינסקי 40',   city: 'פתח תקווה',   notes: 'החלפת פילטר',              createdAt: fmt(-2) },
  { id: 'j24', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c25', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '12:00', estimatedDuration: 120, location: 'הזית 21',          city: 'מודיעין',     notes: 'התקנת בר מים תמי4',        createdAt: fmt(-1) },
  { id: 'j25', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c39', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '14:00', estimatedDuration: 60, location: 'כצנלסון 35',       city: 'בת ים',       notes: 'דליפה מהמערכת',             createdAt: fmt(-1) },
  { id: 'j26', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c40', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '15:00', estimatedDuration: 25, location: 'הפרחים 12',        city: 'נס ציונה',    notes: 'החלפה שנתית',              createdAt: fmt(-1) },
  { id: 'j27', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c41', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '15:30', estimatedDuration: 25, location: 'דרך יפו 77',       city: 'תל אביב',     notes: 'טיפול שגרתי',              createdAt: fmt(-1) },
  { id: 'j28', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c45', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '16:00', estimatedDuration: 60, location: 'ברנר 28',          city: 'גבעת שמואל', notes: 'לא עובד כלל',              createdAt: fmt(-1) },

  // --- יוסי לוי (t2) ---
  { id: 'j29', type: 'installation',      status: 'pending_customer', priority: 'medium', customerId: 'c4', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '08:00', estimatedDuration: 120, location: 'קינג ג׳ורג׳ 23', city: 'ירושלים', notes: 'התקנת מערכת פרימיום', createdAt: fmt(-2) },
  { id: 'j30', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c7',  technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '10:00', estimatedDuration: 25, location: 'יפו 30',           city: 'ירושלים',     notes: 'החלפת פילטר',              createdAt: fmt(-3) },
  { id: 'j31', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c14', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '10:30', estimatedDuration: 60, location: 'המלך דוד 9',       city: 'ירושלים',     notes: 'לחץ מים נמוך',             createdAt: fmt(-1) },
  { id: 'j32', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c17', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '11:30', estimatedDuration: 25, location: 'הרב קוק 5',        city: 'בני ברק',     notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j33', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c26', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '12:00', estimatedDuration: 120, location: 'דרך הים 10',       city: 'אשדוד',       notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j34', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c27', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '14:00', estimatedDuration: 25, location: 'ירושלים 55',       city: 'אשקלון',      notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j35', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c28', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '14:30', estimatedDuration: 60, location: 'יצחק רבין 13',     city: 'הוד השרון',   notes: 'נזילה',                    createdAt: fmt(-1) },
  { id: 'j36', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c31', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '15:30', estimatedDuration: 25, location: 'השקד 2',           city: 'יבנה',        notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j37', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c32', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '16:00', estimatedDuration: 25, location: 'דרך בן גוריון 31', city: 'רמלה',       notes: 'החלפה שנתית',              createdAt: fmt(-1) },

  // ========== יום 2 ==========
  // --- דוד כהן (t1) ---
  { id: 'j38', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c20', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '08:00', estimatedDuration: 60, location: 'הנרייטה סולד 6',   city: 'חולון',       notes: 'המערכת לא נדלקת',          createdAt: fmt(-1) },
  { id: 'j39', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c21', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '09:00', estimatedDuration: 25, location: 'דרך העצמאות 50',   city: 'באר שבע',     notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j40', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c13', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '09:30', estimatedDuration: 120, location: 'הגליל 7',          city: 'נתניה',       notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j41', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c23', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '11:30', estimatedDuration: 25, location: 'מנחם בגין 88',     city: 'תל אביב',     notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j42', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c42', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '12:00', estimatedDuration: 60, location: 'העליה 20',         city: 'חדרה',        notes: 'רעש חזק',                  createdAt: fmt(-1) },
  { id: 'j43', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c37', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '13:00', estimatedDuration: 25, location: 'שד׳ ירושלים 44',   city: 'לוד',         notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j44', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c18', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '13:30', estimatedDuration: 120, location: 'שמואל הנגיד 11',   city: 'ראשון לציון', notes: 'התקנת בר מים',             createdAt: fmt(-1) },
  { id: 'j45', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c38', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '15:30', estimatedDuration: 25, location: 'הדקל 7',           city: 'אילת',        notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j46', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c45', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '16:00', estimatedDuration: 60, location: 'ברנר 28',          city: 'גבעת שמואל', notes: 'תקלה חוזרת',               createdAt: fmt(-1) },

  // --- יוסי לוי (t2) ---
  { id: 'j47', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c37', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '08:00', estimatedDuration: 25, location: 'שד׳ ירושלים 44',   city: 'לוד',         notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j48', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c20', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '08:30', estimatedDuration: 120, location: 'הנרייטה סולד 6',   city: 'חולון',       notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j49', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c21', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '10:30', estimatedDuration: 60, location: 'דרך העצמאות 50',   city: 'באר שבע',     notes: 'אין לחץ מים',              createdAt: fmt(-1) },
  { id: 'j50', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c38', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '11:30', estimatedDuration: 25, location: 'הדקל 7',           city: 'אילת',        notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j51', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c39', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '12:00', estimatedDuration: 25, location: 'כצנלסון 35',       city: 'בת ים',       notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j52', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c40', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '12:30', estimatedDuration: 120, location: 'הפרחים 12',        city: 'נס ציונה',    notes: 'התקנת מסנן',               createdAt: fmt(-1) },
  { id: 'j53', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c41', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '14:30', estimatedDuration: 60, location: 'דרך יפו 77',       city: 'תל אביב',     notes: 'דליפה חזקה',               createdAt: fmt(-1) },
  { id: 'j54', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c42', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '15:30', estimatedDuration: 25, location: 'העליה 20',         city: 'חדרה',        notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j55', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c43', technicianId: 't2', scheduledDate: fmt(2), scheduledTime: '16:00', estimatedDuration: 25, location: 'הרימון 3',         city: 'קריית ביאליק',notes: 'החלפה שנתית',              createdAt: fmt(-1) },

  // ========== יום 3 ==========
  // --- דוד כהן (t1) ---
  { id: 'j56', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c1',  technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '08:00', estimatedDuration: 25, location: 'רוטשילד 12',       city: 'תל אביב',     notes: 'בדיקה חוזרת',              createdAt: fmt(-1) },
  { id: 'j57', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c5',  technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '08:30', estimatedDuration: 60, location: 'דיזנגוף 67',       city: 'תל אביב',     notes: 'תקלה לאחר התקנה',          createdAt: fmt(-1) },
  { id: 'j58', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c9',  technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '09:30', estimatedDuration: 25, location: 'ביאליק 3',         city: 'רמת גן',      notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j59', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c29', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '10:00', estimatedDuration: 120, location: 'הברוש 8',          city: 'רמת השרון',   notes: 'התקנת מערכת חדשה',         createdAt: fmt(-1) },
  { id: 'j60', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c30', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '12:00', estimatedDuration: 25, location: 'ההדסים 16',        city: 'קריית אונו',  notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j61', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c25', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '12:30', estimatedDuration: 60, location: 'הזית 21',          city: 'מודיעין',     notes: 'לא מקרר',                  createdAt: fmt(-1) },
  { id: 'j62', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c24', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '13:30', estimatedDuration: 25, location: 'התמר 4',           city: 'ראש העין',    notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j63', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c31', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '14:00', estimatedDuration: 120, location: 'השקד 2',           city: 'יבנה',        notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j64', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c32', technicianId: 't1', scheduledDate: fmt(3), scheduledTime: '16:00', estimatedDuration: 25, location: 'דרך בן גוריון 31', city: 'רמלה',       notes: 'החלפה שגרתית',             createdAt: fmt(-1) },

  // --- יוסי לוי (t2) ---
  { id: 'j65', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c14', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '08:00', estimatedDuration: 120, location: 'המלך דוד 9',       city: 'ירושלים',     notes: 'התקנת מערכת פרימיום',      createdAt: fmt(-1) },
  { id: 'j66', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c17', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '10:00', estimatedDuration: 25, location: 'הרב קוק 5',        city: 'בני ברק',     notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j67', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c26', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '10:30', estimatedDuration: 60, location: 'דרך הים 10',       city: 'אשדוד',       notes: 'תקלת חשמל',               createdAt: fmt(-1) },
  { id: 'j68', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c27', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '11:30', estimatedDuration: 25, location: 'ירושלים 55',       city: 'אשקלון',      notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j69', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c28', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '12:00', estimatedDuration: 25, location: 'יצחק רבין 13',     city: 'הוד השרון',   notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j70', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c44', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '12:30', estimatedDuration: 120, location: 'התאנה 15',         city: 'קריית מוצקין',notes: 'התקנת מסנן מרכזי',         createdAt: fmt(-1) },
  { id: 'j71', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c35', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '14:30', estimatedDuration: 60, location: 'המייסדים 17',      city: 'עפולה',       notes: 'דליפת מים',                createdAt: fmt(-1) },
  { id: 'j72', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c36', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '15:30', estimatedDuration: 25, location: 'הרצל 60',          city: 'נצרת עילית', notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j73', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c33', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '16:00', estimatedDuration: 25, location: 'האלון 9',          city: 'כרמיאל',      notes: 'טיפול שגרתי',              createdAt: fmt(-1) },

  // ========== יום 4 ==========
  // --- דוד כהן (t1) ---
  { id: 'j74', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c7',  technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '08:00', estimatedDuration: 120, location: 'יפו 30',           city: 'ירושלים',     notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j75', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c10', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '10:00', estimatedDuration: 25, location: 'סוקולוב 18',       city: 'הרצליה',      notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j76', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c15', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '10:30', estimatedDuration: 60, location: 'נורדאו 14',        city: 'תל אביב',     notes: 'תקלה בתמי4',               createdAt: fmt(-1) },
  { id: 'j77', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c19', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '11:30', estimatedDuration: 25, location: 'אוסישקין 27',      city: 'רעננה',       notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j78', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c22', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '12:00', estimatedDuration: 120, location: 'בורוכוב 19',       city: 'גבעתיים',     notes: 'התקנת מערכת סינון',        createdAt: fmt(-1) },
  { id: 'j79', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c8',  technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '14:00', estimatedDuration: 60, location: 'אלנבי 5',          city: 'תל אביב',     notes: 'מים חמים לא עובד',         createdAt: fmt(-1) },
  { id: 'j80', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c11', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '15:00', estimatedDuration: 25, location: 'ויצמן 22',         city: 'כפר סבא',     notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j81', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c12', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '15:30', estimatedDuration: 25, location: 'ז׳בוטינסקי 40',   city: 'פתח תקווה',   notes: 'החלפה שנתית',              createdAt: fmt(-1) },
  { id: 'j82', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c13', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '16:00', estimatedDuration: 60, location: 'הגליל 7',          city: 'נתניה',       notes: 'תקלה חוזרת',               createdAt: fmt(-1) },

  // --- יוסי לוי (t2) ---
  { id: 'j83', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c3',  technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '08:00', estimatedDuration: 60, location: 'בן יהודה 8',       city: 'חיפה',        notes: 'תקלה חוזרת',               createdAt: fmt(-1) },
  { id: 'j84', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c6',  technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '09:00', estimatedDuration: 25, location: 'שד׳ הנשיא 15',    city: 'חיפה',        notes: 'החלפה שנתית',              createdAt: fmt(-1) },
  { id: 'j85', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c16', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '09:30', estimatedDuration: 120, location: 'העצמאות 33',       city: 'חיפה',        notes: 'התקנת מסנן חדש',           createdAt: fmt(-1) },
  { id: 'j86', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c34', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '11:30', estimatedDuration: 25, location: 'הגפן 24',          city: 'טבריה',       notes: 'טיפול שנתי',               createdAt: fmt(-1) },
  { id: 'j87', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c35', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '12:00', estimatedDuration: 60, location: 'המייסדים 17',      city: 'עפולה',       notes: 'רעש חריג',                 createdAt: fmt(-1) },
  { id: 'j88', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c36', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '13:00', estimatedDuration: 25, location: 'הרצל 60',          city: 'נצרת עילית', notes: 'החלפת פילטר',              createdAt: fmt(-1) },
  { id: 'j89', type: 'installation',      status: 'draft',     priority: 'medium', customerId: 'c43', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '13:30', estimatedDuration: 120, location: 'הרימון 3',         city: 'קריית ביאליק',notes: 'התקנה חדשה',               createdAt: fmt(-1) },
  { id: 'j90', type: 'filter_replacement', status: 'draft',     priority: 'low',    customerId: 'c44', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '15:30', estimatedDuration: 25, location: 'התאנה 15',         city: 'קריית מוצקין',notes: 'החלפה שגרתית',             createdAt: fmt(-1) },
  { id: 'j91', type: 'malfunction',       status: 'draft',     priority: 'high',   customerId: 'c45', technicianId: 't2', scheduledDate: fmt(4), scheduledTime: '16:00', estimatedDuration: 60, location: 'ברנר 28',          city: 'גבעת שמואל', notes: 'דליפה מהמערכת',             createdAt: fmt(-1) },
];
