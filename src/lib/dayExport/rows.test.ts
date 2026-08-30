import { describe, expect, it } from 'vitest';
import { Customer, Job } from '@/types';
import { buildDayExportRows, type DayExportEntry } from './rows';

// The downloadable day table is built from the entries the dialog is CURRENTLY rendering
// (job + on-screen start/end time), so an unsaved reorder can never make the file
// disagree with the screen. What each column may contain — and what it must not — is the
// contract these tests pin down.

const job = (id: string, overrides: Partial<Job> = {}): Job => ({
  id,
  type: 'filter_replacement',
  status: 'confirmed',
  priority: 'low',
  customerId: `c-${id}`,
  estimatedDuration: 20,
  location: '',
  city: '',
  notes: '',
  createdAt: '2026-08-01',
  ...overrides,
});

const customer = (id: string, overrides: Partial<Customer> = {}): Customer => ({
  id,
  name: `לקוח ${id}`,
  phone: '050-0000000',
  address: '',
  city: '',
  email: '',
  product: '',
  filterReplacementMonth: 1,
  ...overrides,
});

const entry = (j: Job, startTime = '10:00', endTime = '10:20'): DayExportEntry => ({
  job: j,
  startTime,
  endTime,
});

describe('buildDayExportRows — identity of the stop', () => {
  it('numbers the rows by list position, not by time', () => {
    const rows = buildDayExportRows(
      [
        entry(job('a'), '13:00', '13:20'),
        entry(job('b'), '10:00', '10:20'),
      ],
      [],
    );
    expect(rows.map((r) => [r.order, r.time])).toEqual([
      [1, '13:00-13:20'],
      [2, '10:00-10:20'],
    ]);
  });

  it('joins the time range with an ASCII hyphen so bidi keeps it one left-to-right unit', () => {
    const [row] = buildDayExportRows([entry(job('a'), '09:40', '11:00')], []);
    expect(row.time).toBe('09:40-11:00');
    expect(row.time).not.toContain('–');
  });

  it('resolves the name from the customer record', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { customerId: 'c1' }))],
      [customer('c1', { name: 'ישראל ישראלי' })],
    );
    expect(row.name).toBe('ישראל ישראלי');
  });

  it('falls back to the name carried on the job when no customer record resolves', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { customerId: 'missing', customerName: 'לקוח מהיומן' }))],
      [],
    );
    expect(row.name).toBe('לקוח מהיומן');
  });

  it('prints a dash rather than an empty cell when nothing resolves at all', () => {
    const [row] = buildDayExportRows([entry(job('a', { customerId: 'missing' }))], []);
    expect(row.name).toBe('—');
  });

  it('prefers the phone on the job over the one on the customer card', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { customerId: 'c1', phone: '052-1111111' }))],
      [customer('c1', { phone: '050-0000000' })],
    );
    expect(row.phone).toBe('052-1111111');
  });

  it('leaves the phone empty when neither side has one', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { customerId: 'c1' }))],
      [customer('c1', { phone: '' })],
    );
    expect(row.phone).toBe('');
  });
});

describe('buildDayExportRows — address', () => {
  it('joins street and city', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { location: 'הרצל 5', city: 'כפר סבא' }))],
      [],
    );
    expect(row.address).toBe('הרצל 5, כפר סבא');
  });

  it('does not repeat the city when the ongoing-service row stores it in both fields', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { location: 'צורן', city: 'צורן' }))],
      [],
    );
    expect(row.address).toBe('צורן');
  });

  it('survives a stop with no address at all', () => {
    const [row] = buildDayExportRows([entry(job('a'))], []);
    expect(row.address).toBe('');
  });
});

describe('buildDayExportRows — notes and outcome', () => {
  it('carries both halves of the joined notes string', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { notes: 'פילטר שנתי | להגיע אחרי 10:00' }))],
      [],
    );
    expect(row.notes).toBe('פילטר שנתי — להגיע אחרי 10:00');
  });

  it('keeps a description with no free-text half on its own', () => {
    const [row] = buildDayExportRows([entry(job('a', { notes: 'נזילה מתחת לכיור' }))], []);
    expect(row.notes).toBe('נזילה מתחת לכיור');
  });

  it('leaves the status empty until the technician has reported', () => {
    const [row] = buildDayExportRows([entry(job('a'))], []);
    expect(row.status).toBe('');
    expect(row.technicianNotes).toBe('');
  });

  it('uses the plain outcome label — the screen prefixes ✓/✗/↻, which the PDF font has no glyph for', () => {
    const rows = buildDayExportRows(
      [
        entry(job('a', { completionStatus: 'done' })),
        entry(job('b', { completionStatus: 'not_done' })),
        entry(job('c', { completionStatus: 'need_return' })),
      ],
      [],
    );
    expect(rows.map((r) => r.status)).toEqual(['בוצע', 'לא בוצע', 'צריך לחזור']);
  });

  it('keeps the line breaks inside a technician note', () => {
    const [row] = buildDayExportRows(
      [entry(job('a', { completionNotes: 'הוחלף פילטר.\nלחזור בעוד חצי שנה.' }))],
      [],
    );
    expect(row.technicianNotes).toBe('הוחלף פילטר.\nלחזור בעוד חצי שנה.');
  });

  it('labels the job by type', () => {
    const rows = buildDayExportRows(
      [
        entry(job('a', { type: 'filter_replacement' })),
        entry(job('b', { type: 'malfunction' })),
        entry(job('c', { type: 'installation' })),
      ],
      [],
    );
    expect(rows.map((r) => r.type)).toEqual(['החלפת פילטר', 'תקלה', 'התקנה חדשה']);
  });
});
