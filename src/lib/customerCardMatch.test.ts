import { describe, expect, it } from 'vitest';
import {
  jobRowMatchesCustomer,
  phoneKey,
  phoneVariants,
  resolveCustomerCard,
} from './customerCardMatch';
import type { Customer } from '@/types';

const customer = (over: Partial<Customer> & Pick<Customer, 'id'>): Customer => ({
  name: 'ישראל ישראלי',
  phone: '',
  address: '',
  city: '',
  email: '',
  product: '',
  filterReplacementMonth: 1,
  ...over,
});

const card = customer({
  id: 'db-cust-11111111-1111-1111-1111-111111111111',
  name: 'ישראל ישראלי',
  phone: '052-123-4567',
});

describe('resolveCustomerCard', () => {
  it('returns a real customer as-is', () => {
    expect(resolveCustomerCard(card, [card])).toBe(card);
  });

  // A malfunction/installation "customer" is synthesized from the job row and points at
  // nothing — but it carries the real customer name, which is the customers table's key.
  it('matches a job-derived customer to its card by name', () => {
    const derived = customer({ id: 'db-malf-cust-abc', name: 'ישראל ישראלי' });
    expect(resolveCustomerCard(derived, [card])).toBe(card);
  });

  it('ignores case and extra whitespace when matching by name', () => {
    const derived = customer({ id: 'db-inst-cust-abc', name: '  ישראל   ישראלי ' });
    expect(resolveCustomerCard(derived, [card])).toBe(card);
  });

  it('falls back to the phone when the name does not match', () => {
    const derived = customer({
      id: 'db-malf-cust-abc',
      name: 'ישראל י.',
      phone: '0521234567',
    });
    expect(resolveCustomerCard(derived, [card])).toBe(card);
  });

  // Calendar-derived ongoing rows put the task description in `name`, so matching on it
  // would attach the edit to a nonsense card.
  it('never matches an ongoing-service customer by its task-description name', () => {
    const taskNamed = customer({
      id: 'db-ongoing-cust-abc',
      name: 'ישראל ישראלי',
    });
    expect(resolveCustomerCard(taskNamed, [card])).toBeNull();
  });

  it('still matches an ongoing-service customer on phone', () => {
    const taskNamed = customer({
      id: 'db-ongoing-cust-abc',
      name: 'ביקור שירות',
      phone: '052 123 4567',
    });
    expect(resolveCustomerCard(taskNamed, [card])).toBe(card);
  });

  it('returns null when nothing matches', () => {
    const derived = customer({ id: 'db-malf-cust-abc', name: 'לקוח אחר' });
    expect(resolveCustomerCard(derived, [card])).toBeNull();
  });

  it('ignores a too-short phone rather than matching loosely', () => {
    const shortPhone = customer({ id: 'db-malf-cust-abc', name: 'לקוח אחר', phone: '1234' });
    const cardShort = customer({ id: 'db-cust-2', name: 'מישהו', phone: '1234' });
    expect(resolveCustomerCard(shortPhone, [cardShort])).toBeNull();
  });

  it('returns null for a missing customer', () => {
    expect(resolveCustomerCard(undefined, [card])).toBeNull();
  });
});

describe('phoneKey', () => {
  it('collapses the spellings the imported data actually uses', () => {
    const keys = ['052-123-4567', '0521234567', '052 1234567'].map(phoneKey);
    expect(new Set(keys).size).toBe(1);
  });

  it('is empty for a missing phone', () => {
    expect(phoneKey(null)).toBe('');
    expect(phoneKey(undefined)).toBe('');
  });
});

describe('phoneVariants', () => {
  it('includes the dashed and undashed spellings of a 10-digit mobile', () => {
    const v = phoneVariants('0544653216');
    expect(v).toContain('0544653216');
    expect(v).toContain('054-4653216');
    expect(v).toContain('054-465-3216');
  });

  it('normalises an international number back to the local form', () => {
    expect(phoneVariants('+972544653216')).toContain('0544653216');
  });

  it('refuses to guess from too few digits — a short key is not an identity', () => {
    expect(phoneVariants('1234')).toEqual([]);
    expect(phoneVariants('')).toEqual([]);
  });
});

describe('jobRowMatchesCustomer', () => {
  const target = { name: 'יאיר כהן', phone: '054-465-3216' };

  it('matches on phone across differing spellings', () => {
    expect(
      jobRowMatchesCustomer({ customer_name: 'י. כהן', phone: '0544653216' }, target),
    ).toBe(true);
  });

  it('rejects a same-name row with a different phone', () => {
    // Namesakes are common; the phone has to win when both sides have one.
    expect(
      jobRowMatchesCustomer({ customer_name: 'יאיר כהן', phone: '052-000-0000' }, target),
    ).toBe(false);
  });

  it('falls back to the name only when the row has no usable phone', () => {
    expect(jobRowMatchesCustomer({ customer_name: 'יאיר כהן', phone: null }, target)).toBe(true);
    expect(jobRowMatchesCustomer({ customer_name: 'דנה לוי', phone: null }, target)).toBe(false);
  });

  it('normalises whitespace and case in the name fallback', () => {
    expect(jobRowMatchesCustomer({ customer_name: '  יאיר   כהן ', phone: '' }, target)).toBe(true);
  });

  it('does not match when neither key is usable', () => {
    expect(jobRowMatchesCustomer({ customer_name: '', phone: '' }, target)).toBe(false);
  });

  it('falls back to the name when the CUSTOMER has no phone on file', () => {
    expect(
      jobRowMatchesCustomer(
        { customer_name: 'יאיר כהן', phone: '0544653216' },
        { name: 'יאיר כהן', phone: '' },
      ),
    ).toBe(true);
  });
});
