import { describe, expect, it } from 'vitest';
import { Customer, Job } from '@/types';
import { buildRouteSheetRows } from './routeSheet';
import { calculateTimeRanges } from './utils';

// The printed sheet is the technician's plan of record for the day, so the numbered
// column has to reproduce the approved route exactly — the same order the manager saw
// in the approval dialog. Order rides on scheduledTime; the "משימה" column carries only
// the description half of the joined notes string (see src/lib/jobNotes.ts).

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

describe('buildRouteSheetRows — order', () => {
  it('follows scheduledTime, not the order the jobs arrive in', () => {
    const rows = buildRouteSheetRows(
      [
        job('c', { scheduledTime: '13:00' }),
        job('a', { scheduledTime: '10:00' }),
        job('b', { scheduledTime: '11:20' }),
      ],
      [],
    );
    expect(rows.map((r) => r.order)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.task)).toEqual(['', '', '']);
    expect(
      buildRouteSheetRows(
        [
          job('c', { scheduledTime: '13:00', notes: 'ג' }),
          job('a', { scheduledTime: '10:00', notes: 'א' }),
          job('b', { scheduledTime: '11:20', notes: 'ב' }),
        ],
        [],
      ).map((r) => r.task),
    ).toEqual(['א', 'ב', 'ג']);
  });

  it('sorts stops with no time last, not first', () => {
    const rows = buildRouteSheetRows(
      [job('none', { notes: 'ללא שעה' }), job('timed', { scheduledTime: '10:00', notes: 'עם שעה' })],
      [],
    );
    expect(rows.map((r) => r.task)).toEqual(['עם שעה', 'ללא שעה']);
  });

  it('keeps the incoming order for stops sharing a time', () => {
    const rows = buildRouteSheetRows(
      [
        job('second', { scheduledTime: '10:00', notes: 'שני' }),
        job('first', { scheduledTime: '10:00', notes: 'ראשון' }),
      ],
      [],
    );
    expect(rows.map((r) => r.task)).toEqual(['שני', 'ראשון']);
  });

  // How the approval dialog feeds this helper: on-screen start times derived from list
  // position. Sorting by them is the identity, so the sheet's numbers can never diverge
  // from the numbers next to the stops on screen — even mid-reorder, before a save.
  it('reproduces on-screen positions when fed calculateTimeRanges start times', () => {
    const onScreen = [
      job('x', { estimatedDuration: 60, notes: 'ראשון', scheduledTime: '14:00' }),
      job('y', { estimatedDuration: 20, notes: 'שני', scheduledTime: '10:00' }),
      job('z', { estimatedDuration: 20, notes: 'שלישי', scheduledTime: '11:00' }),
    ];
    const rows = buildRouteSheetRows(
      calculateTimeRanges(onScreen).map(({ job: j, startTime }) => ({
        ...j,
        scheduledTime: startTime,
      })),
      [],
    );
    expect(rows.map((r) => r.task)).toEqual(['ראשון', 'שני', 'שלישי']);
  });
});

describe('buildRouteSheetRows — cells', () => {
  it('prints only the description half of the joined notes string', () => {
    const [row] = buildRouteSheetRows(
      [job('a', { scheduledTime: '10:00', notes: 'בדיקת מרכך | הלקוח ביקש להתקשר לפני' })],
      [],
    );
    expect(row.task).toBe('בדיקת מרכך');
  });

  it('keeps notes that have no separator as-is', () => {
    const [row] = buildRouteSheetRows(
      [job('a', { scheduledTime: '10:00', notes: 'החלפת פילטר שנתית' })],
      [],
    );
    expect(row.task).toBe('החלפת פילטר שנתית');
  });

  it('joins address from location and city, without repeating a duplicated value', () => {
    const rows = buildRouteSheetRows(
      [
        job('a', { scheduledTime: '10:00', location: 'האילן 56', city: 'צורן' }),
        job('b', { scheduledTime: '11:00', location: 'צורן', city: 'צורן' }),
        job('c', { scheduledTime: '12:00', location: '', city: 'נתניה' }),
      ],
      [],
    );
    expect(rows.map((r) => r.address)).toEqual(['האילן 56, צורן', 'צורן', 'נתניה']);
  });

  it("prefers the job's own phone over the customer card's", () => {
    const rows = buildRouteSheetRows(
      [
        job('a', { scheduledTime: '10:00', customerId: 'cust-1', phone: '052-1111111' }),
        job('b', { scheduledTime: '11:00', customerId: 'cust-1' }),
      ],
      [customer('cust-1', { phone: '053-2222222' })],
    );
    expect(rows.map((r) => r.phone)).toEqual(['052-1111111', '053-2222222']);
  });

  it('resolves the customer name and falls back rather than printing an empty cell', () => {
    const rows = buildRouteSheetRows(
      [
        job('a', { scheduledTime: '10:00', customerId: 'cust-1' }),
        job('b', { scheduledTime: '11:00', customerId: 'db-ongoing-cust-missing' }),
      ],
      [customer('cust-1', { name: 'אלירן דור' })],
    );
    expect(rows.map((r) => r.name)).toEqual(['אלירן דור', '—']);
    expect(rows[1].phone).toBe('');
  });
});
