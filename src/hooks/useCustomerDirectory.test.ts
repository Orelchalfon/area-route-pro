import { describe, expect, it } from 'vitest';
import { buildCustomerSearchFilter } from './useCustomerDirectory';

// The customers page searches the DB, not an in-memory slice, so the bug lives in
// this filter string. A rejected filter surfaces as an error/empty state rather than
// a crash, which is why the exact string is pinned here.
describe('buildCustomerSearchFilter', () => {
  const PHRASE = (term: string) =>
    `name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%,address.ilike.%${term}%`;

  it('leaves a single-word query exactly as it was before the word-order fix', () => {
    expect(buildCustomerSearchFilter('אגסי')).toBe(PHRASE('אגסי'));
  });

  it('keeps the whole-phrase branches on every column for a multi-word query', () => {
    expect(buildCustomerSearchFilter('נילי אגסי')).toContain(PHRASE('נילי אגסי'));
  });

  it('adds a name-only AND branch so either word order matches', () => {
    expect(buildCustomerSearchFilter('נילי אגסי')).toBe(
      `${PHRASE('נילי אגסי')},and(name.ilike.%נילי%,name.ilike.%אגסי%)`,
    );
  });

  it('does not AND across columns — only `name` appears inside the and()', () => {
    const and = buildCustomerSearchFilter('נילי אגסי').split('and(')[1];
    expect(and).not.toMatch(/phone|city|address/);
  });

  it('adds no AND branch when a token is too short to be selective', () => {
    expect(buildCustomerSearchFilter('א אגסי')).toBe(PHRASE('א אגסי'));
  });

  it('caps the AND branch so a long paste cannot build an unbounded filter', () => {
    const filter = buildCustomerSearchFilter('אחד שתיים שלוש ארבע חמש שש');
    expect(filter.split('name.ilike.').length - 1).toBe(1 + 4);
  });

  it('handles a three-word name', () => {
    expect(buildCustomerSearchFilter('אגסי משה נילי')).toBe(
      `${PHRASE('אגסי משה נילי')},and(name.ilike.%אגסי%,name.ilike.%משה%,name.ilike.%נילי%)`,
    );
  });
});
