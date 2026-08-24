import { describe, expect, it } from 'vitest';
import {
  buildCustomerVisits,
  type CustomerVisitRows,
  type JobRowShape,
} from './useCustomerVisits';

const CUSTOMER = { name: 'יאיר כהן', phone: '054-465-3216' };
const UUID = '11111111-1111-1111-1111-111111111111';

const rows = (over: Partial<CustomerVisitRows> = {}): CustomerVisitRows => ({
  malfunctions: [],
  installations: [],
  ongoing: [],
  filters: [],
  ...over,
});

const malf = (over: Partial<JobRowShape> & Pick<JobRowShape, 'id'>): JobRowShape => ({
  customer_name: CUSTOMER.name,
  phone: CUSTOMER.phone,
  scheduled_date: '2026-05-10',
  ...over,
});

describe('buildCustomerVisits', () => {
  it('keeps a visit the technician could NOT complete', () => {
    // The whole point of the feature: arriving and not fixing is still a visit.
    const out = buildCustomerVisits(
      rows({
        malfunctions: [
          malf({ id: 'a', completion_status: 'not_done', completion_notes: 'הלקוח לא היה בבית' }),
        ],
      }),
      CUSTOMER,
      UUID,
    );
    expect(out).toHaveLength(1);
    expect(out[0].completionStatus).toBe('not_done');
    expect(out[0].completionNotes).toBe('הלקוח לא היה בבית');
  });

  it('keeps need_return visits', () => {
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', completion_status: 'need_return' })] }),
      CUSTOMER,
      UUID,
    );
    expect(out[0].completionStatus).toBe('need_return');
  });

  it('keeps ARCHIVED (closed) visits and flags them', () => {
    // Closing a call archives the row; every normal loader hides it. History must not.
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', status: 'archived', completion_status: 'done' })] }),
      CUSTOMER,
      UUID,
    );
    expect(out).toHaveLength(1);
    expect(out[0].archived).toBe(true);
  });

  it('reports an unreported visit as having no outcome rather than dropping it', () => {
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', completion_status: null })] }),
      CUSTOMER,
      UUID,
    );
    expect(out).toHaveLength(1);
    expect(out[0].completionStatus).toBeNull();
  });

  it('matches a row on its phone even when the spelling differs', () => {
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', phone: '0544653216' })] }),
      CUSTOMER,
      null,
    );
    expect(out).toHaveLength(1);
  });

  it('drops a same-name row whose phone belongs to someone else', () => {
    // Two people share a name often enough that the phone has to win.
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', phone: '052-000-0000' })] }),
      CUSTOMER,
      null,
    );
    expect(out).toEqual([]);
  });

  it('trusts a customer_id match regardless of the row phone', () => {
    const out = buildCustomerVisits(
      rows({ malfunctions: [malf({ id: 'a', customer_id: UUID, phone: '052-000-0000' })] }),
      CUSTOMER,
      UUID,
    );
    expect(out).toHaveLength(1);
  });

  it('does not phone-filter ongoing rows (calendar rows carry no phone)', () => {
    const out = buildCustomerVisits(
      rows({
        ongoing: [
          { id: 'o1', task_description: 'ביקור שירות', service_date: '2026-03-02', phone: null },
        ],
      }),
      CUSTOMER,
      UUID,
    );
    expect(out).toHaveLength(1);
    expect(out[0].description).toBe('ביקור שירות');
  });

  it('uses job_key as the board id for filter services', () => {
    const out = buildCustomerVisits(
      rows({
        filters: [
          {
            id: 'row-uuid',
            job_key: 'filter-2026-3-db-cust-x',
            scheduled_date: '2026-03-11',
            location: 'הרצל 1',
          },
        ],
      }),
      CUSTOMER,
      UUID,
    );
    expect(out[0].jobKey).toBe('filter-2026-3-db-cust-x');
    expect(out[0].location).toBe('הרצל 1');
  });

  it('sorts newest first and dedupes by board id', () => {
    const out = buildCustomerVisits(
      rows({
        malfunctions: [
          malf({ id: 'a', scheduled_date: '2026-01-05' }),
          malf({ id: 'b', scheduled_date: '2026-07-20' }),
          malf({ id: 'a', scheduled_date: '2026-01-05' }),
        ],
      }),
      CUSTOMER,
      UUID,
    );
    expect(out.map((v) => v.date)).toEqual(['2026-07-20', '2026-01-05']);
  });

  it('falls back to the row own date when it was never scheduled', () => {
    const out = buildCustomerVisits(
      rows({
        malfunctions: [
          malf({ id: 'a', scheduled_date: null, malfunction_date: '2026-02-02' }),
        ],
      }),
      CUSTOMER,
      UUID,
    );
    expect(out[0].date).toBe('2026-02-02');
  });
});
