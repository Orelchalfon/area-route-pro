import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { Job } from '@/types';
import {
  areaForCity,
  normalizeCity,
  normalizeCityName,
  getSubArea,
  groupJobsByArea,
  UNASSIGNED_AREA,
} from './areas';
import { SETTLEMENT_AREA } from '@/lib/generated/settlementAreas';

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

  it('falls back to UNASSIGNED_AREA for a nonsense settlement name', () => {
    expect(areaForCity('עיר-דמיונית-שאיננה')).toBe(UNASSIGNED_AREA);
  });

  it('resolves settlements of various types via the generated CBS data', () => {
    expect(areaForCity('חיפה')).toBe('צפון'); // city
    expect(areaForCity('כפר תבור')).toBe('צפון'); // moshav
    expect(areaForCity('ניר עם')).toBe('דרום'); // kibbutz
    // Community settlement in Gush Etzion: the generated settlement data (keyed
    // by סמל_נפה 7x = יהודה ושומרון) resolves this to 'שומרון', not 'ירושלים' --
    // there is no CITY_AREA override for it. Asserting actual behavior; flagged
    // for the manager to reconcile against the intended business area.
    expect(areaForCity('אלון שבות')).toBe('שומרון');
  });

  it('CITY_AREA business override wins over the generated settlement tier', () => {
    expect(areaForCity('מודיעין')).toBe('ירושלים');
  });

  it('normalizes whitespace and geresh variants before matching', () => {
    expect(areaForCity('פתח תקוה')).toBe('מרכז');
    expect(areaForCity(' פתח  תקווה ')).toBe('מרכז');
    // Geresh-bearing variant: not a direct CITY_AREA key, so it only resolves via
    // normalizeCityName() stripping the geresh before the settlement-tier lookup.
    expect(areaForCity("פתח תקווה'")).toBe('מרכז');
  });
});

describe('normalizeCity', () => {
  it('collapses whitespace and applies aliases', () => {
    expect(normalizeCity('  תל   אביב ')).toBe('תל אביב');
    expect(normalizeCity('רמת השרן')).toBe('רמת השרון');
  });
});

describe('normalizeCityName / SETTLEMENT_AREA parity', () => {
  it('reproduces the generated map keys for a spanning sample of raw settlement names', () => {
    const snapshotPath = resolve(process.cwd(), 'scripts/data/settlements.json');
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
      records: Array<{ שם_ישוב: string }>;
    };
    const records = snapshot.records;
    expect(records.length).toBeGreaterThan(0);

    const sampleSize = 20;
    const step = Math.max(1, Math.floor(records.length / sampleSize));
    const sample = Array.from({ length: sampleSize }, (_, i) =>
      records[Math.min(i * step, records.length - 1)],
    );

    for (const record of sample) {
      const raw = record['שם_ישוב'];
      const normalized = normalizeCityName(raw);
      expect(SETTLEMENT_AREA, `normalizeCityName(${JSON.stringify(raw)}) -> "${normalized}" missing from SETTLEMENT_AREA`).toHaveProperty(
        normalized,
      );
    }
  });
});

describe('getSubArea', () => {
  it('looks up a known sub-area from the generated settlement data', () => {
    expect(getSubArea('רחובות')).toBe('שפלה ומרכז');
    // Ra'anana's CBS נפה is פתח תקווה, so it lands in 'שפלה ומרכז' — not the
    // intuitively-expected 'השרון'. Asserting the real CBS classification.
    expect(getSubArea('רעננה')).toBe('שפלה ומרכז');
    // 'תל אביב' resolves via the generated double-name variant key
    // ('תל אביב - יפו' also emits 'תל אביב').
    expect(getSubArea('תל אביב')).toBe('גוש דן');
    expect(getSubArea('חיפה')).toBe('חוף הכרמל וחדרה');
  });

  it('never throws and returns undefined for an unknown settlement', () => {
    expect(() => getSubArea('עיר-דמיונית-שאיננה')).not.toThrow();
    expect(getSubArea('עיר-דמיונית-שאיננה')).toBeUndefined();
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

  it('tags each city group with its CBS sub-area when known', () => {
    const groups = groupJobsByArea([
      job('1', 'חיפה'),
      job('2', 'עיר דמיונית'),
    ]);
    const north = groups.find((g) => g.area === 'צפון')!;
    expect(north.cities[0].subArea).toBe('חוף הכרמל וחדרה');
    const other = groups.find((g) => g.area === UNASSIGNED_AREA)!;
    expect(other.cities[0].subArea).toBeUndefined();
  });
});
