import { describe, it, expect } from 'vitest';
// Helpers live in tracked scripts/ (scripts/import/ is gitignored) so plain node can
// run the repair scripts while vitest still covers the risky matching logic.
import {
  parseCSVRecords,
  phoneKey9,
  phoneKeyApp,
  nameKey,
  importKeyOf,
  richness,
  readOutlookContact,
  isBadPhone,
  isBadAddress,
  classifyField,
  isProtectedRow,
  buildContacts,
  nameSimilarity,
  pairContacts,
  // @ts-expect-error — plain .mjs module, no type declarations
} from '../../scripts/customerMatch.mjs';

describe('phoneKey9', () => {
  it('collapses every way the same line is written', () => {
    const keys = ['054-4653216', '0544653216', '+972544653216', '054 4653216'].map(phoneKey9);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('544653216');
  });

  it('rejects numbers too short to be a real line', () => {
    expect(phoneKey9('054')).toBeNull();
    expect(phoneKey9('09779598')).toBeNull();
    expect(phoneKey9('')).toBeNull();
  });
});

describe('phoneKeyApp', () => {
  it('keeps all digits, unlike phoneKey9 — the two must stay different', () => {
    expect(phoneKeyApp('054-4653216')).toBe('0544653216');
    expect(phoneKey9('054-4653216')).toBe('544653216');
  });

  it('accepts 7 digits, which phoneKey9 rejects', () => {
    expect(phoneKeyApp('9779598')).toBe('9779598');
    expect(phoneKey9('9779598')).toBeNull();
  });
});

describe('nameKey', () => {
  it('matches a reversed Hebrew name — the whole point of the merge', () => {
    expect(nameKey('אלהרר איתן')).toBe(nameKey('איתן אלהרר'));
    expect(nameKey('שילוני אהוד')).toBe(nameKey('אהוד שילוני'));
  });

  it('ignores punctuation and case', () => {
    expect(nameKey('Dan Cohen')).toBe(nameKey('cohen dan'));
    expect(nameKey('בלה, כהן')).toBe(nameKey('כהן בלה'));
  });

  it('does not collapse different people', () => {
    expect(nameKey('איתן אלהרר')).not.toBe(nameKey('איתן אלמוג'));
  });

  it('returns null for an empty name', () => {
    expect(nameKey('   ')).toBeNull();
  });
});

describe('importKeyOf', () => {
  it('does NOT sort words — this is why deleting a duplicate can strand a job row', () => {
    expect(importKeyOf('אלהרר איתן')).not.toBe(importKeyOf('איתן אלהרר'));
  });

  it('still trims, lowercases and collapses whitespace', () => {
    expect(importKeyOf('  Dan   Cohen ')).toBe('name:dan cohen');
  });
});

describe('richness', () => {
  it('ranks a complete twin above a bare name', () => {
    const full = { phone: '0501234567', address: 'סהרון 31', city: 'אריאל' };
    const bare = { name: 'אלהרר איתן' };
    expect(richness(full)).toBeGreaterThan(richness(bare));
    expect(richness(bare)).toBe(0);
  });

  it('ignores blank strings', () => {
    expect(richness({ phone: '   ', address: '', city: null })).toBe(0);
  });
});

describe('readOutlookContact', () => {
  it('reads the Hebrew-headed export', () => {
    const c = readOutlookContact({
      'שם פרטי': 'איתן',
      'שם משפחה': 'אלהרר',
      'טלפון נייד': '050-3618741',
      'רחוב כתובת הבית': 'סהרון 31',
      'עיר כתובת הבית': 'אריאל',
      'כתובת דואר אלקטרוני': 'eitan@example.com',
    });
    expect(c).toMatchObject({
      name: 'איתן אלהרר',
      address: 'סהרון 31',
      city: 'אריאל',
      email: 'eitan@example.com',
    });
    expect(c.phones).toEqual(['050-3618741']);
  });

  it('reads the older English-headed export too', () => {
    const c = readOutlookContact({
      'First Name': 'Dan',
      'Last Name': 'Cohen',
      'Mobile Phone': '054-1112222',
      'Home Street': 'הרצל 5',
      'Home City': 'נתניה',
    });
    expect(c.name).toBe('Dan Cohen');
    expect(c.address).toBe('הרצל 5');
    expect(c.phones).toEqual(['054-1112222']);
  });

  it('falls back to the company when there is no person name', () => {
    expect(readOutlookContact({ 'חברה': 'אינטק הולדינגס' }).name).toBe('אינטק הולדינגס');
  });

  it('keeps distinct numbers but drops the same line repeated across fields', () => {
    const c = readOutlookContact({
      'שם פרטי': 'רון',
      'טלפון נייד': '054-1112222',
      'טלפון עיקרי': '0541112222',
      'טלפון בבית': '09-8887777',
    });
    expect(c.phones).toEqual(['054-1112222', '09-8887777']);
  });
});

describe('parseCSVRecords', () => {
  it('keeps rows aligned across a quoted multi-line notes field', () => {
    const rows = parseCSVRecords(
      '﻿שם פרטי,הערות,טלפון נייד\n' +
        'רון,"שורה 1\nשורה 2",054-1112222\n' +
        'דנה,,054-3334444\n',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]['הערות']).toBe('שורה 1\nשורה 2');
    expect(rows[0]['טלפון נייד']).toBe('054-1112222');
    expect(rows[1]['שם פרטי']).toBe('דנה');
  });

  it('handles escaped quotes in a company name', () => {
    const rows = parseCSVRecords('חברה\n"אינטק בע""מ"\n');
    expect(rows[0]['חברה']).toBe('אינטק בע"מ');
  });
});

describe('classifyField', () => {
  it('fills a blank', () => {
    expect(classifyField('address', '', 'סהרון 31')).toBe('fill');
    expect(classifyField('phone', '   ', '050-3618741')).toBe('fill');
  });

  it('skips when the incoming value is empty or already the same', () => {
    expect(classifyField('address', 'סהרון 31', '')).toBe('skip');
    expect(classifyField('phone', '054-4653216', '+972544653216')).toBe('skip');
    expect(classifyField('city', 'אריאל', ' אריאל ')).toBe('skip');
  });

  it('repairs a phone too short to dial, but calls a full one a conflict', () => {
    expect(classifyField('phone', '054', '050-3618741')).toBe('repair');
    expect(classifyField('phone', '052-2054444', '054-4369469')).toBe('conflict');
  });

  it('repairs an address that is really just the city', () => {
    expect(classifyField('address', 'קרני שומרון', 'פעמון 22', { city: 'קרני שומרון' })).toBe(
      'repair',
    );
    expect(classifyField('address', 'סהרון', 'סהרון 31')).toBe('repair');
    expect(classifyField('address', 'סהרון 31', 'הרצל 5')).toBe('conflict');
  });

  it('never auto-repairs a city or an email', () => {
    expect(classifyField('city', 'נתניה', 'כפר סבא')).toBe('conflict');
    expect(classifyField('email', 'a@b.com', 'c@d.com')).toBe('conflict');
  });

  it('downgrades repair to conflict on in-app entries, but still fills blanks', () => {
    expect(classifyField('phone', '054', '050-3618741', { protected: true })).toBe('conflict');
    expect(classifyField('phone', '', '050-3618741', { protected: true })).toBe('fill');
  });
});

describe('isProtectedRow', () => {
  it('protects in-app entries and leaves imported rows repairable', () => {
    expect(isProtectedRow({ import_key: 'name:דן כהן' })).toBe(true);
    expect(isProtectedRow({ import_key: null })).toBe(true);
    expect(isProtectedRow({ import_key: 'rivhit:000003015' })).toBe(false);
    expect(isProtectedRow({ import_key: 'outlook:615877ed04188738' })).toBe(false);
  });
});

describe('bad-value predicates', () => {
  it('flags undialable phones only', () => {
    expect(isBadPhone('054')).toBe(true);
    expect(isBadPhone('09779598')).toBe(true);
    expect(isBadPhone('054-4653216')).toBe(false);
  });

  it('does not flag a blank address — that is a fill, not a repair', () => {
    expect(isBadAddress('', 'אריאל')).toBe(false);
  });

  it('does not flag a real street address', () => {
    expect(isBadAddress('נתיב השיירות 13', 'קרני שומרון')).toBe(false);
    expect(isBadAddress('משה דיין 86', '')).toBe(false);
  });
});

describe('buildContacts — collapsing duplicate cards inside Outlook', () => {
  const rec = (o: Record<string, string>) => o;

  it('merges two copies that share a phone and a name, pooling their fields', () => {
    const contacts = buildContacts([
      rec({ 'שם פרטי': 'יוסי', 'שם משפחה': 'אלבז', 'טלפון נייד': '054-1112222' }),
      rec({ 'שם פרטי': 'יוסי', 'שם משפחה': 'אלבז', 'טלפון נייד': '054-1112222',
            'רחוב כתובת הבית': 'רעם 6', 'עיר כתובת הבית': 'אריאל' }),
    ]);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ address: 'רעם 6', city: 'אריאל' });
  });

  it('merges same-name copies even when they share no phone — the split-card case', () => {
    // Outlook keeps the phone on one card and the street on another; they never
    // share a number, so a phone-only merge rule misses them entirely.
    const contacts = buildContacts([
      rec({ 'שם פרטי': 'רוני', 'שם משפחה': 'זרובבל', 'טלפון נייד': '054-1112222' }),
      rec({ 'שם פרטי': 'רוני', 'שם משפחה': 'זרובבל', 'רחוב כתובת הבית': 'הרעות 22' }),
    ]);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].address).toBe('הרעות 22');
    expect(contacts[0].phones).toEqual(['054-1112222']);
  });

  it('does NOT merge two single-word names — they are plausibly different people', () => {
    const contacts = buildContacts([
      rec({ 'שם פרטי': 'יוסי', 'טלפון נייד': '054-1112222' }),
      rec({ 'שם פרטי': 'יוסי', 'רחוב כתובת הבית': 'בירנבאום 3' }),
    ]);
    expect(contacts).toHaveLength(2);
  });

  it('keeps a shared household line as two people, not one merged contact', () => {
    const contacts = buildContacts([
      rec({ 'שם פרטי': 'נתי', 'שם משפחה': 'כהן', 'טלפון בבית': '09-8887777' }),
      rec({ 'שם פרטי': 'דנה', 'שם משפחה': 'לוי', 'טלפון בבית': '09-8887777' }),
    ]);
    expect(contacts).toHaveLength(2);
  });
});

describe('nameSimilarity', () => {
  it('is 1 for a reversed name and 0 for strangers', () => {
    expect(nameSimilarity('איתן אלהרר', 'אלהרר איתן')).toBe(1);
    expect(nameSimilarity('איתן אלהרר', 'דנה לוי')).toBe(0);
  });

  it('is partial when one name is a subset of the other', () => {
    const s = nameSimilarity('דני רוטמן', 'דני רוטמן ובניו');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('pairContacts', () => {
  const contact = (name: string, phone = '', address = '') => ({
    name, phones: phone ? [phone] : [], address, city: '', email: '',
  });

  it('prefers a phone match and reports how it matched', () => {
    const pairs = pairContacts(
      [{ id: 'a', name: 'דני רוטמן', phone: '054-7779902' }],
      [contact('רוטמן דני', '054-7779902', 'הזמיר 18')],
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].matchedBy).toBe('טלפון');
  });

  it('matches on an exact name when there is no phone', () => {
    const pairs = pairContacts(
      [{ id: 'a', name: 'איתן אלהרר', phone: '' }],
      [contact('אלהרר איתן', '', 'סהרון 31')],
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].matchedBy).toBe('שם');
  });

  it('refuses a shared line whose name is unrelated', () => {
    // 052-9456253 is one number on two unrelated cards in the real data.
    expect(pairContacts(
      [{ id: 'a', name: 'ברכה ברנרד', phone: '054-4938968' }],
      [contact('מרגה קוממיות', '054-4938968', 'הרצל 5')],
    )).toHaveLength(0);
  });

  it('gives each contact to at most one customer', () => {
    const pairs = pairContacts(
      [{ id: 'a', name: 'דני רוטמן', phone: '054-7779902' },
       { id: 'b', name: 'דני רוטמן', phone: '054-7779902' }],
      [contact('דני רוטמן', '054-7779902', 'הזמיר 18')],
    );
    expect(pairs).toHaveLength(1);
  });
});
