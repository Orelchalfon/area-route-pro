import { Technician, Customer, Job } from '@/types';

export const technicians: Technician[] = [
  { id: 't1', name: 'דוד כהן', region: 'תל אביב', skills: ['פילטרים', 'התקנות', 'תקלות'], phone: '+972-50-1234567' },
  { id: 't2', name: 'יוסי לוי', region: 'חיפה', skills: ['פילטרים', 'תקלות'], phone: '+972-52-2345678' },
  { id: 't3', name: 'עמית שפירא', region: 'ירושלים', skills: ['התקנות', 'פילטרים'], phone: '+972-54-3456789' },
  { id: 't4', name: 'נועם בן-ארי', region: 'תל אביב', skills: ['תקלות', 'התקנות'], phone: '+972-50-4567890' },
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
];

// Helper to get dates relative to today
const today = new Date();
const fmt = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

export const initialJobs: Job[] = [
  // Today - t1
  { id: 'j1', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c1', technicianId: 't1', scheduledDate: fmt(0), scheduledTime: '08:00', estimatedDuration: 30, location: 'רוטשילד 12', city: 'תל אביב', notes: 'החלפת פילטר שנתית', createdAt: fmt(-1) },
  { id: 'j2', type: 'malfunction', status: 'draft', priority: 'high', customerId: 'c2', technicianId: 't1', scheduledDate: fmt(0), scheduledTime: '09:00', estimatedDuration: 60, location: 'הרצל 45', city: 'תל אביב', notes: 'אין מים קרים - דחוף', createdAt: fmt(-1) },
  // Today - t2
  { id: 'j5', type: 'malfunction', status: 'confirmed', priority: 'high', customerId: 'c3', technicianId: 't2', scheduledDate: fmt(0), scheduledTime: '08:30', estimatedDuration: 60, location: 'בן יהודה 8', city: 'חיפה', notes: 'נזילה ביחידה', createdAt: fmt(-1) },
  { id: 'j6', type: 'filter_replacement', status: 'confirmed', priority: 'low', customerId: 'c6', technicianId: 't2', scheduledDate: fmt(0), scheduledTime: '10:00', estimatedDuration: 30, location: 'שד׳ הנשיא 15', city: 'חיפה', notes: 'טיפול שנתי', createdAt: fmt(-2) },
  // Tomorrow - t1
  { id: 'j3', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c5', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '10:00', estimatedDuration: 180, location: 'דיזנגוף 67', city: 'תל אביב', notes: 'מערכת אוסמוזה 5 שלבים', createdAt: fmt(-2) },
  { id: 'j4', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c8', technicianId: 't1', scheduledDate: fmt(1), scheduledTime: '14:00', estimatedDuration: 30, location: 'אלנבי 5', city: 'תל אביב', notes: 'החלפה שגרתית', createdAt: fmt(-3) },
  // Tomorrow - t2
  { id: 'j7', type: 'installation', status: 'pending_customer', priority: 'medium', customerId: 'c4', technicianId: 't2', scheduledDate: fmt(1), scheduledTime: '09:00', estimatedDuration: 180, location: 'קינג ג׳ורג׳ 23', city: 'ירושלים', notes: 'התקנת מערכת פרימיום', createdAt: fmt(-2) },
  // Day 2 - t1
  { id: 'j8', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c7', technicianId: 't1', scheduledDate: fmt(2), scheduledTime: '09:00', estimatedDuration: 30, location: 'יפו 30', city: 'ירושלים', notes: 'החלפת פילטר', createdAt: fmt(-3) },
  // Day 3 - t2
  { id: 'j9', type: 'malfunction', status: 'draft', priority: 'high', customerId: 'c1', technicianId: 't2', scheduledDate: fmt(3), scheduledTime: '08:00', estimatedDuration: 60, location: 'רוטשילד 12', city: 'תל אביב', notes: 'לחץ מים נמוך', createdAt: fmt(-1) },
  // Day 4 - t1
  { id: 'j10', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c3', technicianId: 't1', scheduledDate: fmt(4), scheduledTime: '10:00', estimatedDuration: 180, location: 'בן יהודה 8', city: 'חיפה', notes: 'התקנה חדשה', createdAt: fmt(-1) },
  // Day 5 - t2
  { id: 'j11', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c5', technicianId: 't2', scheduledDate: fmt(5), scheduledTime: '09:00', estimatedDuration: 30, location: 'דיזנגוף 67', city: 'תל אביב', notes: 'החלפה שנתית', createdAt: fmt(-1) },
];
