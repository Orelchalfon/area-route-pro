import { describe, expect, it } from 'vitest';
import { jobMatchesSearch } from './jobSearch';
import type { Customer, Job } from '@/types';

const job = (over: Partial<Job> = {}): Job => ({
  id: 'db-malf-1',
  type: 'malfunction',
  status: 'confirmed',
  priority: 'high',
  customerId: 'db-cust-1',
  estimatedDuration: 60,
  location: 'הרצל 12',
  city: 'קרני שומרון',
  notes: 'דליפה מתחת לכיור | לתאם מראש',
  createdAt: '2026-08-20',
  ...over,
});

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: 'db-cust-1',
  name: 'משה כהן',
  phone: '052-123-4567',
  address: 'הרצל 12',
  city: 'קרני שומרון',
  email: 'moshe@example.com',
  product: 'אוסמוזה',
  filterReplacementMonth: 3,
  ...over,
});

describe('jobMatchesSearch', () => {
  it('matches everything when the query is empty or whitespace', () => {
    expect(jobMatchesSearch(job(), customer(), '')).toBe(true);
    expect(jobMatchesSearch(job(), customer(), '   ')).toBe(true);
  });

  it('matches on customer name, including a partial', () => {
    expect(jobMatchesSearch(job(), customer(), 'משה')).toBe(true);
    expect(jobMatchesSearch(job(), customer(), 'משה כהן')).toBe(true);
    expect(jobMatchesSearch(job(), customer(), 'דנה')).toBe(false);
  });

  it('matches on the address and the city', () => {
    expect(jobMatchesSearch(job(), customer(), 'הרצל')).toBe(true);
    expect(jobMatchesSearch(job(), customer(), 'קרני')).toBe(true);
  });

  // JobCard renders the job's own location/city, not the customer's — so a job whose
  // customer record is missing or synthesized still has to be findable by address.
  it("matches on the job's own location and city when the customer is unknown", () => {
    expect(jobMatchesSearch(job(), undefined, 'הרצל')).toBe(true);
    expect(jobMatchesSearch(job(), undefined, 'קרני שומרון')).toBe(true);
    expect(jobMatchesSearch(job(), undefined, 'משה')).toBe(false);
  });

  it('is case-insensitive for latin text', () => {
    const c = customer({ name: 'David Levi', city: 'Ariel' });
    expect(jobMatchesSearch(job({ city: 'Ariel' }), c, 'david')).toBe(true);
    expect(jobMatchesSearch(job({ city: 'Ariel' }), c, 'ARIEL')).toBe(true);
  });

  it('matches a phone regardless of how either side is punctuated', () => {
    for (const stored of ['052-123-4567', '0521234567', '052 1234567']) {
      const c = customer({ phone: stored });
      expect(jobMatchesSearch(job(), c, '0521234567')).toBe(true);
      expect(jobMatchesSearch(job(), c, '052-123')).toBe(true);
      expect(jobMatchesSearch(job(), c, '1234567')).toBe(true);
    }
  });

  it("matches the job's own phone when the customer has none", () => {
    const c = customer({ phone: '' });
    expect(jobMatchesSearch(job({ phone: '054-9876543' }), c, '0549876')).toBe(true);
  });

  it('does not phone-match on one or two digits', () => {
    // "2" appears in almost every number in the day; treating that as a phone search
    // would return the whole list and look broken. Digit-free address/city here so
    // this exercises the phone path only — a digit inside an address is a legitimate
    // text match (see the next case).
    const j = job({ location: 'רחוב הזית', city: 'קרני שומרון', phone: undefined });
    const c = customer({ address: 'רחוב הזית' });
    expect(jobMatchesSearch(j, c, '2')).toBe(false);
    expect(jobMatchesSearch(j, c, '52')).toBe(false);
    expect(jobMatchesSearch(j, c, '521')).toBe(true);
  });

  it('still matches a house number in the address as plain text', () => {
    expect(jobMatchesSearch(job(), customer(), '12')).toBe(true);
  });

  it('does not match a job with no phone anywhere', () => {
    const c = customer({ phone: '' });
    expect(jobMatchesSearch(job({ phone: undefined }), c, '0521234567')).toBe(false);
  });

  it('does not search job notes or the type label', () => {
    expect(jobMatchesSearch(job(), customer(), 'דליפה')).toBe(false);
    expect(jobMatchesSearch(job(), customer(), 'תקלה')).toBe(false);
  });
});
