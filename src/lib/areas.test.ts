import { describe, it, expect } from 'vitest';
import { Job } from '@/types';
import {
  areaForCity,
  normalizeCity,
  groupJobsByArea,
  UNASSIGNED_AREA,
} from './areas';

describe('areaForCity', () => {
  it('maps known cities to their geographic area', () => {
    expect(areaForCity('חיפה')).toBe('צפון');
    expect(areaForCity('הרצליה')).toBe('מרכז');
    expect(areaForCity('מודיעין')).toBe('ירושלים');
    expect(areaForCity('באר שבע')).toBe('דרום');
    expect(areaForCity('ברוכין')).toBe('שומרון');
  });

  it('resolves aliases and stray whitespace', () => {
    expect(areaForCity('ת"א')).toBe('מרכז');
    expect(areaForCity('  פתח תקוה ')).toBe('מרכז');
    expect(areaForCity('ק.גת')).toBe('דרום');
  });

  it('matches a known city inside a compound free-text entry', () => {
    expect(areaForCity('סביוני הכרמל חיפה')).toBe('צפון');
    expect(areaForCity('נווה ים הרצליה')).toBe('מרכז');
  });

  it('falls back for unknown or empty cities', () => {
    expect(areaForCity('עיר דמיונית')).toBe(UNASSIGNED_AREA);
    expect(areaForCity('')).toBe(UNASSIGNED_AREA);
  });
});

describe('normalizeCity', () => {
  it('collapses whitespace and applies aliases', () => {
    expect(normalizeCity('  תל   אביב ')).toBe('תל אביב');
    expect(normalizeCity('רמת השרן')).toBe('רמת השרון');
  });
});

describe('groupJobsByArea', () => {
  const job = (id: string, city: string): Job =>
    ({ id, city, type: 'malfunction', status: 'draft' } as unknown as Job);

  it('groups cities under areas in north→south order with correct counts', () => {
    const groups = groupJobsByArea([
      job('1', 'באר שבע'),
      job('2', 'חיפה'),
      job('3', 'חיפה'),
      job('4', 'עיר דמיונית'),
    ]);

    expect(groups.map((g) => g.area)).toEqual(['צפון', 'דרום', UNASSIGNED_AREA]);
    const north = groups.find((g) => g.area === 'צפון')!;
    expect(north.count).toBe(2);
    expect(north.cities[0]).toMatchObject({ city: 'חיפה' });
    expect(north.cities[0].jobs).toHaveLength(2);
  });
});
