import { describe, expect, it } from 'vitest';
import { resolveCustomerCard } from './customerCardMatch';
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
