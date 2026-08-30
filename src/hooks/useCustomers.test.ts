import { describe, expect, it } from 'vitest';
import {
  CustomerRow,
  customerToRow,
  isSelectableCustomer,
  rowToCustomer,
} from './useCustomers';
import type { Customer } from '@/types';

const row = (over: Partial<CustomerRow> = {}): CustomerRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'ישראל ישראלי',
  phone: '052-123-4567',
  address: 'הרצל 1',
  city: 'נתניה',
  email: null,
  product: null,
  filter_replacement_month: 3,
  service_track: null,
  next_service_date: null,
  notes: null,
  lat: null,
  lng: null,
  place_id: null,
  is_active: true,
  deleted_at: null,
  ...over,
});

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: 'db-cust-11111111-1111-1111-1111-111111111111',
  name: 'ישראל ישראלי',
  phone: '',
  address: '',
  city: '',
  email: '',
  product: '',
  filterReplacementMonth: 1,
  ...over,
});

describe('soft-delete row mapping', () => {
  it('treats a normal row as active', () => {
    const mapped = rowToCustomer(row());
    expect(mapped.isActive).toBe(true);
    expect(mapped.deletedAt).toBeUndefined();
  });

  // is_active is NOT NULL DEFAULT true in the schema, but a row read before the column
  // existed (or through a narrower select) can arrive as null. Only an explicit false
  // means deleted — anything else must stay selectable, or a null would silently hide
  // the whole customer list.
  it('only treats an explicit false as deleted', () => {
    expect(rowToCustomer(row({ is_active: null })).isActive).toBe(true);
    expect(rowToCustomer(row({ is_active: false })).isActive).toBe(false);
  });

  it('exposes the deletion timestamp', () => {
    const mapped = rowToCustomer(
      row({ is_active: false, deleted_at: '2026-08-30T09:00:00.000Z' }),
    );
    expect(mapped.isActive).toBe(false);
    expect(mapped.deletedAt).toBe('2026-08-30T09:00:00.000Z');
  });
});

describe('customerToRow soft-delete columns', () => {
  it('omits the columns entirely when they are not part of the patch', () => {
    const patch = customerToRow({ phone: '0500000000' });
    expect('is_active' in patch).toBe(false);
    expect('deleted_at' in patch).toBe(false);
  });

  it('stamps both columns when deleting', () => {
    const patch = customerToRow({ isActive: false, deletedAt: '2026-08-30T09:00:00.000Z' });
    expect(patch.is_active).toBe(false);
    expect(patch.deleted_at).toBe('2026-08-30T09:00:00.000Z');
  });

  // Restoring has to pass an explicit null: `undefined` means "leave this column alone",
  // so a restore that sent undefined would set is_active back to true while leaving a
  // stale deleted_at behind.
  it('clears deleted_at on restore when passed null', () => {
    const patch = customerToRow({ isActive: true, deletedAt: null });
    expect(patch.is_active).toBe(true);
    expect(patch.deleted_at).toBeNull();
  });
});

describe('isSelectableCustomer', () => {
  it('excludes soft-deleted customers from new work', () => {
    expect(isSelectableCustomer(customer({ isActive: false }))).toBe(false);
  });

  it('keeps active customers', () => {
    expect(isSelectableCustomer(customer({ isActive: true }))).toBe(true);
  });

  // Job-derived customers (db-malf-cust-*, db-inst-cust-*, ics-c*) are synthesized in
  // memory and carry no flag — they must never be filtered out.
  it('keeps customers that carry no flag at all', () => {
    expect(isSelectableCustomer(customer({ id: 'db-malf-cust-abc' }))).toBe(true);
  });
});
