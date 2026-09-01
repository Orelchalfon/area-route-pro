import { describe, expect, it } from 'vitest';
import {
  buildDbJobUpdatePatch,
  buildOngoingServiceInsert,
  type NewJobInsertInput,
} from './dbJobSync';

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

describe('buildDbJobUpdatePatch — customer_name', () => {
  // A calendar row has customer_name null, so the app names it after task_description.
  // Persisting a name we resolved some other way is what stops the description doubling
  // as the customer's identity on the board.
  it('writes a resolved name to ongoing_services.customer_name', () => {
    expect(
      buildDbJobUpdatePatch('ongoing_services', { customerName: 'אלעד נתני' }).customer_name,
    ).toBe('אלעד נתני');
  });

  // malfunctions/installations get customer_name from the request form — it is the
  // authoritative name for those rows and must never be inferred from a phone match.
  it('never touches customer_name on malfunctions or installations', () => {
    expect(
      buildDbJobUpdatePatch('malfunctions', { customerName: 'אלעד נתני' }),
    ).not.toHaveProperty('customer_name');
    expect(
      buildDbJobUpdatePatch('installations', { customerName: 'אלעד נתני' }),
    ).not.toHaveProperty('customer_name');
  });

  // The bug this whole change exists for: editing the notes in the day-approval modal
  // sends `description`, which lands in task_description. That must not carry an identity
  // change with it, or the chip on the control panel gets renamed by a note.
  it('leaves customer_name alone when only the notes are edited', () => {
    const patch = buildDbJobUpdatePatch('ongoing_services', {
      description: 'תלת',
      notes: 'לתאם מראש',
    });
    expect(patch.task_description).toBe('תלת');
    expect(patch).not.toHaveProperty('customer_name');
  });

  it('does not invent the column on an ordinary scheduling write', () => {
    expect(
      buildDbJobUpdatePatch('ongoing_services', {
        technicianId: 't1',
        scheduledDate: '2026-09-01',
      }),
    ).not.toHaveProperty('customer_name');
  });
});
