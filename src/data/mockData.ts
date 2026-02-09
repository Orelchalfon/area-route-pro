import { Technician, Customer, Job } from '@/types';

export const technicians: Technician[] = [
  { id: 't1', name: 'David Cohen', region: 'Tel Aviv', skills: ['filters', 'installations', 'malfunctions'], phone: '+972-50-1234567' },
  { id: 't2', name: 'Yossi Levi', region: 'Haifa', skills: ['filters', 'malfunctions'], phone: '+972-52-2345678' },
  { id: 't3', name: 'Amit Shapira', region: 'Jerusalem', skills: ['installations', 'filters'], phone: '+972-54-3456789' },
  { id: 't4', name: 'Noam Ben-Ari', region: 'Tel Aviv', skills: ['malfunctions', 'installations'], phone: '+972-50-4567890' },
];

export const customers: Customer[] = [
  { id: 'c1', name: 'Sarah Goldstein', phone: '+972-50-1111111', address: '12 Rothschild Blvd', city: 'Tel Aviv' },
  { id: 'c2', name: 'Michael Rubin', phone: '+972-52-2222222', address: '45 Herzl St', city: 'Tel Aviv' },
  { id: 'c3', name: 'Rachel Mizrahi', phone: '+972-54-3333333', address: '8 Ben Yehuda St', city: 'Haifa' },
  { id: 'c4', name: 'Daniel Peretz', phone: '+972-50-4444444', address: '23 King George St', city: 'Jerusalem' },
  { id: 'c5', name: 'Tamar Avrahami', phone: '+972-52-5555555', address: '67 Dizengoff St', city: 'Tel Aviv' },
  { id: 'c6', name: 'Eyal Katz', phone: '+972-54-6666666', address: '15 HaNassi Ave', city: 'Haifa' },
  { id: 'c7', name: 'Noa Friedman', phone: '+972-50-7777777', address: '30 Jaffa Rd', city: 'Jerusalem' },
  { id: 'c8', name: 'Oren Schwartz', phone: '+972-52-8888888', address: '5 Allenby St', city: 'Tel Aviv' },
];

export const initialJobs: Job[] = [
  { id: 'j1', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c1', technicianId: 't1', scheduledDate: '2026-02-10', scheduledTime: '08:00', estimatedDuration: 30, location: '12 Rothschild Blvd', city: 'Tel Aviv', notes: 'Annual filter replacement', createdAt: '2026-02-08' },
  { id: 'j2', type: 'malfunction', status: 'draft', priority: 'high', customerId: 'c2', technicianId: 't1', scheduledDate: '2026-02-10', scheduledTime: '09:00', estimatedDuration: 60, location: '45 Herzl St', city: 'Tel Aviv', notes: 'No cold water - urgent', createdAt: '2026-02-09' },
  { id: 'j3', type: 'installation', status: 'draft', priority: 'medium', customerId: 'c5', technicianId: 't4', scheduledDate: '2026-02-10', scheduledTime: '10:00', estimatedDuration: 180, location: '67 Dizengoff St', city: 'Tel Aviv', notes: 'New 5-stage RO system', createdAt: '2026-02-07' },
  { id: 'j4', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c8', technicianId: 't1', scheduledDate: '2026-02-10', scheduledTime: '10:30', estimatedDuration: 30, location: '5 Allenby St', city: 'Tel Aviv', notes: 'Routine replacement', createdAt: '2026-02-06' },
  { id: 'j5', type: 'malfunction', status: 'confirmed', priority: 'high', customerId: 'c3', technicianId: 't2', scheduledDate: '2026-02-10', scheduledTime: '08:30', estimatedDuration: 60, location: '8 Ben Yehuda St', city: 'Haifa', notes: 'Leaking unit', createdAt: '2026-02-08' },
  { id: 'j6', type: 'filter_replacement', status: 'confirmed', priority: 'low', customerId: 'c6', technicianId: 't2', scheduledDate: '2026-02-10', scheduledTime: '10:00', estimatedDuration: 30, location: '15 HaNassi Ave', city: 'Haifa', notes: 'Annual service', createdAt: '2026-02-05' },
  { id: 'j7', type: 'installation', status: 'pending_customer', priority: 'medium', customerId: 'c4', technicianId: 't3', scheduledDate: '2026-02-10', scheduledTime: '09:00', estimatedDuration: 180, location: '23 King George St', city: 'Jerusalem', notes: 'Premium system install', createdAt: '2026-02-07' },
  { id: 'j8', type: 'filter_replacement', status: 'draft', priority: 'low', customerId: 'c7', technicianId: 't3', scheduledDate: '2026-02-10', scheduledTime: '13:00', estimatedDuration: 30, location: '30 Jaffa Rd', city: 'Jerusalem', notes: 'Filter change', createdAt: '2026-02-06' },
];
