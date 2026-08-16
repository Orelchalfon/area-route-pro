import { describe, expect, it } from 'vitest';
import { buildOngoingServiceInsert, type NewJobInsertInput } from './dbJobSync';

const input = (over: Partial<NewJobInsertInput> = {}): NewJobInsertInput => ({
  customerName: 'ישראל ישראלי',
  ...over,
});

describe('buildOngoingServiceInsert', () => {
  describe('task_description', () => {
    it('prefers taskDescription over notes and productType', () => {
      const row = buildOngoingServiceInsert(
        input({
          taskDescription: 'להחליף פילטר מהדר — ישראל ישראלי',
          notes: 'לתאם מראש',
          productType: 'אוסמוזה',
        }),
        '2026-09-15',
      );
      expect(row.task_description).toBe('להחליף פילטר מהדר — ישראל ישראלי');
      // The free-text half stays in its own column, so the two don't get joined into
      // "תיאור | תיאור" when useOngoingServices rebuilds Job.notes.
      expect(row.notes).toBe('לתאם מראש');
    });

    it('falls back to notes, then productType, then the generic label', () => {
      expect(
        buildOngoingServiceInsert(input({ notes: 'לתאם מראש', productType: 'אוסמוזה' }), '2026-09-15')
          .task_description,
      ).toBe('לתאם מראש');
      expect(
        buildOngoingServiceInsert(input({ productType: 'אוסמוזה' }), '2026-09-15').task_description,
      ).toBe('אוסמוזה');
      expect(buildOngoingServiceInsert(input(), '2026-09-15').task_description).toBe('שירות שוטף');
    });
  });

  describe('customer_id', () => {
    // Readers either strip the prefix (the RLS policy compares
    // replace(customer_id, 'db-cust-', '') = customers.id::text) or re-add it
    // (useOngoingServices does makeDbCustomerId(row.customer_id)), so the column has to hold
    // the raw uuid — storing it prefixed produced `db-cust-db-cust-…` on read.
    const uuid = '2f1c4a90-7b3e-4d21-9a55-8c0e1b6f4d33';

    it('strips the db-cust- prefix the app-side id carries', () => {
      expect(
        buildOngoingServiceInsert(input({ customerId: `db-cust-${uuid}` }), '2026-09-15').customer_id,
      ).toBe(uuid);
    });

    it('passes a bare uuid through unchanged', () => {
      expect(
        buildOngoingServiceInsert(input({ customerId: uuid }), '2026-09-15').customer_id,
      ).toBe(uuid);
    });

    it('is null when there is no customer (one-time / calendar rows)', () => {
      expect(buildOngoingServiceInsert(input(), '2026-09-15').customer_id).toBeNull();
    });
  });

  it('creates the row unscheduled when no technician/date is given', () => {
    const row = buildOngoingServiceInsert(input({ taskDescription: 'ביקור שירות' }), '2026-09-15');
    expect(row.service_date).toBe('2026-09-15');
    expect(row.scheduled_date).toBeNull();
    expect(row.technician_id).toBeNull();
    expect(row.status).toBe('draft');
  });
});
