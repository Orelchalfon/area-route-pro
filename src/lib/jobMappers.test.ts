import { describe, expect, it } from 'vitest';
import { mapCompletionStatus, mapPriority, mapStatus } from './jobMappers';

describe('mapStatus', () => {
  it('passes through the canonical statuses', () => {
    for (const s of ['draft', 'pending_customer', 'confirmed', 'in_progress', 'completed', 'rescheduled'] as const) {
      expect(mapStatus(s)).toBe(s);
    }
  });

  it("defaults unknown/empty to 'draft' (malfunctions/installations/ongoing)", () => {
    expect(mapStatus(null)).toBe('draft');
    expect(mapStatus(undefined)).toBe('draft');
    expect(mapStatus('pending')).toBe('draft');
    expect(mapStatus('whatever')).toBe('draft');
  });

  it("honors an explicit default (scheduled filter services use 'confirmed')", () => {
    expect(mapStatus(null, 'confirmed')).toBe('confirmed');
    expect(mapStatus('pending', 'confirmed')).toBe('confirmed');
    expect(mapStatus('confirmed', 'confirmed')).toBe('confirmed');
    // a known canonical value still wins over the default
    expect(mapStatus('draft', 'confirmed')).toBe('draft');
  });
});

describe('mapPriority', () => {
  it('passes through english priorities', () => {
    expect(mapPriority('high')).toBe('high');
    expect(mapPriority('medium')).toBe('medium');
    expect(mapPriority('low')).toBe('low');
  });

  it("defaults unknown to 'low'", () => {
    expect(mapPriority(null)).toBe('low');
    expect(mapPriority(undefined)).toBe('low');
    expect(mapPriority('urgent')).toBe('low');
  });

  it('ignores Hebrew labels unless hebrew:true (ongoing services)', () => {
    expect(mapPriority('גבוהה')).toBe('low');
    expect(mapPriority('בינונית')).toBe('low');
  });

  it('accepts Hebrew labels when hebrew:true (malfunctions)', () => {
    expect(mapPriority('גבוהה', { hebrew: true })).toBe('high');
    expect(mapPriority('בינונית', { hebrew: true })).toBe('medium');
    expect(mapPriority('low', { hebrew: true })).toBe('low');
    expect(mapPriority('bogus', { hebrew: true })).toBe('low');
  });
});

describe('mapCompletionStatus', () => {
  it('passes through the completion statuses', () => {
    expect(mapCompletionStatus('done')).toBe('done');
    expect(mapCompletionStatus('not_done')).toBe('not_done');
    expect(mapCompletionStatus('need_return')).toBe('need_return');
  });

  it('returns undefined for anything else', () => {
    expect(mapCompletionStatus(null)).toBeUndefined();
    expect(mapCompletionStatus(undefined)).toBeUndefined();
    expect(mapCompletionStatus('')).toBeUndefined();
    expect(mapCompletionStatus('pending')).toBeUndefined();
  });
});
