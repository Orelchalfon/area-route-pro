// Shared matching / classification helpers for the customer-list cleanup.
//
// Deliberately dependency-free and PII-free so it can live in tracked `scripts/`
// (unlike `scripts/import/`, which is gitignored) and be imported both by plain
// `node` from the repair scripts and by vitest from src/lib/customerMatch.test.ts.
//
// The two phone keys below are NOT interchangeable — see phoneKey9 / phoneKeyApp.

// --- RFC-4180 CSV parser (lifted verbatim from scripts/backfill_customers.mjs) ---
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || (c === '\r' && n === '\n')) { row.push(field); rows.push(row); row = []; field = ''; if (c === '\r') i++; }
    else if (c === '\r') { /* skip lone CR */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Rows as objects keyed by header. */
export function parseCSVRecords(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((v) => (v || '').trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const clean = (v) => (v || '').replace(/\s+/g, ' ').trim();
const z = (v) => (v === null || v === undefined ? '' : String(v).trim());

/**
 * Last 9 digits — 054-4653216 / 0544653216 / +972544653216 all collapse to one key.
 * Port of rivhit_phone_key (scripts/import/merge_rivhit_customers.sql:62-65), the rule
 * that produced today's pairings. Use for customer<->customer and Outlook<->customer.
 */
export function phoneKey9(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : null;
}

/**
 * ALL digits, minimum 7 — reproduces phoneKey in src/lib/customerCardMatch.ts:7-9.
 * Use ONLY where we must see what the running app sees (job -> customer card).
 * Deliberately different from phoneKey9; do not unify them.
 */
export function phoneKeyApp(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.length >= 7 ? d : null;
}

/**
 * Word-order-insensitive, Hebrew-aware name key. Port of rivhit_name_key
 * (merge_rivhit_customers.sql:68-82) — the only matcher that catches
 * 'אלהרר איתן' === 'איתן אלהרר'.
 */
export function nameKey(name) {
  const words = String(name || '').toLowerCase()
    .split(/[^0-9a-z\u0590-\u05FF]+/).filter(Boolean);
  return words.length ? words.sort().join(' ') : null;
}

/**
 * Mirrors customerImportKey (src/hooks/useCustomers.ts:69-71): trim + lowercase +
 * collapse. Note it does NOT sort words, which is exactly why deleting a duplicate
 * matched under nameKey can strand a job row.
 */
export function importKeyOf(name) {
  return `name:${String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

/** How much a customer row is worth keeping — decides which twin survives a merge. */
export function richness(c) {
  if (!c) return 0;
  return [c.phone, c.address, c.city, c.email, c.service_track, c.lat]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
}

// --- Outlook export ------------------------------------------------------------
// The 21/08/2026 export is Hebrew-headed with 92 columns; the March one was English.
// Every field lists both so either layout parses.
const H = {
  first:   ['שם פרטי', 'First Name'],
  middle:  ['שם פרטי שני', 'Middle Name'],
  last:    ['שם משפחה', 'Last Name'],
  company: ['חברה', 'Company'],
  phones:  ['טלפון נייד', 'Mobile Phone', 'טלפון עיקרי', 'Primary Phone',
            'טלפון בבית', 'Home Phone', 'טלפון בבית 2', 'Home Phone 2',
            'טלפון בעבודה', 'Business Phone', 'טלפון בעבודה 2', 'Business Phone 2',
            'טלפון אחר', 'Other Phone', 'טלפון ראשי של החברה', 'Company Main Phone'],
  street:  ['רחוב כתובת הבית', 'Home Street', 'רחוב כתובת העבודה', 'Business Street',
            'רחוב אחר', 'Other Street'],
  city:    ['עיר כתובת הבית', 'Home City', 'עיר כתובת העבודה', 'Business City',
            'עיר אחרת', 'Other City'],
  email:   ['כתובת דואר אלקטרוני', 'E-mail Address'],
};

const pick = (row, keys) => {
  for (const k of keys) { const v = clean(row[k]); if (v) return v; }
  return '';
};

export function readOutlookContact(row) {
  const name = clean([pick(row, H.first), pick(row, H.middle), pick(row, H.last)]
    .filter(Boolean).join(' ')) || pick(row, H.company);
  const phones = [];
  const seen = new Set();
  for (const k of H.phones) {
    const v = clean(row[k]);
    if (!v) continue;
    const key = phoneKey9(v);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    phones.push(v);
  }
  return {
    name,
    phones,
    address: pick(row, H.street),
    city: pick(row, H.city),
    email: pick(row, H.email),
  };
}

// --- Field classification ------------------------------------------------------

/** A phone too short to dial. */
export const isBadPhone = (v) => String(v || '').replace(/\D/g, '').length < 9;

/** An "address" that is really just the city, or a bare token with no street number. */
export function isBadAddress(v, city) {
  const a = clean(v);
  if (!a) return false;
  if (city && a.toLowerCase() === clean(city).toLowerCase()) return true;
  return !/\d/.test(a) && a.split(' ').length === 1;
}

const sameValue = (field, a, b) =>
  field === 'phone'
    ? phoneKey9(a) !== null && phoneKey9(a) === phoneKey9(b)
    : clean(a).toLowerCase() === clean(b).toLowerCase();

/**
 * 'fill'     — current is empty, take the incoming value
 * 'repair'   — current is provably broken, replace it
 * 'conflict' — both plausible and different: review only, never written
 * 'skip'     — nothing to do
 *
 * ctx.protected marks the manager's own in-app entries (import_key 'name:*' or null),
 * for which 'repair' degrades to 'conflict'.
 */
export function classifyField(field, current, incoming, ctx = {}) {
  const cur = clean(current), inc = clean(incoming);
  if (!inc) return 'skip';
  if (!cur) return 'fill';
  if (sameValue(field, cur, inc)) return 'skip';

  let bad = false;
  if (field === 'phone') bad = isBadPhone(cur);
  else if (field === 'address') bad = isBadAddress(cur, ctx.city);
  // city and email are never auto-repaired.

  if (bad && !ctx.protected) return 'repair';
  return 'conflict';
}

/** The manager's own in-app entries are the least tolerant of clobbering. */
export const isProtectedRow = (c) => {
  const k = (c && c.import_key) || '';
  return !k || k.startsWith('name:');
};

// --- Stage A1: contacts, with Outlook's own duplicates collapsed -----------------

/**
 * Outlook holds 1,241 phone numbers shared by more than one contact, and ~585 of those
 * groups are the same person entered twice. Dropping every ambiguous match (the naive
 * approach) throws away most of the fillable addresses, so collapse the true duplicates
 * first: contacts that share a phone AND agree on nameKey become one merged candidate,
 * pooling whichever fields each copy happens to carry.
 */
export function buildContacts(records) {
  const raw = records.map(readOutlookContact).filter((c) => c.name || c.phones.length);

  const parent = raw.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  const byPhone = new Map();
  raw.forEach((c, i) => {
    for (const p of c.phones) {
      const k = phoneKey9(p);
      if (!k) continue;
      if (!byPhone.has(k)) byPhone.set(k, []);
      byPhone.get(k).push(i);
    }
  });
  for (const idxs of byPhone.values()) {
    for (let i = 1; i < idxs.length; i++) {
      if (nameKey(raw[idxs[0]].name) === nameKey(raw[idxs[i]].name)) union(idxs[0], idxs[i]);
    }
  }

  // Outlook also holds the same person twice under one name with the details split
  // across the copies — the phone on one card, the street on the other — and those
  // copies share no phone, so the pass above misses them. Merge on an identical full
  // name too, but only when the name has at least two words: two entries reading just
  // "יוסי" are plausibly two different people, while two reading "יוסי אלבז" are not.
  const byFullName = new Map();
  raw.forEach((c, i) => {
    const k = nameKey(c.name);
    if (!k || k.split(' ').length < 2) return;
    if (!byFullName.has(k)) byFullName.set(k, []);
    byFullName.get(k).push(i);
  });
  for (const idxs of byFullName.values()) {
    for (let i = 1; i < idxs.length; i++) union(idxs[0], idxs[i]);
  }

  const groups = new Map();
  raw.forEach((_, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  });

  return [...groups.values()].map((idxs) => {
    const members = idxs.map((i) => raw[i]);
    const firstOf = (f) => members.map((m) => m[f]).find((v) => z(v)) || '';
    const phones = [];
    const seen = new Set();
    for (const m of members) {
      for (const p of m.phones) {
        const k = phoneKey9(p);
        if (k && seen.has(k)) continue;
        if (k) seen.add(k);
        phones.push(p);
      }
    }
    return { name: firstOf('name'), phones, address: firstOf('address'),
             city: firstOf('city'), email: firstOf('email') };
  });
}

/** Token overlap — Hebrew-safe and dependency-free. */
export function nameSimilarity(a, b) {
  const A = new Set((nameKey(a) || '').split(' ').filter(Boolean));
  const B = new Set((nameKey(b) || '').split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.max(A.size, B.size);
}

// --- Stage A2: pair contacts to customers ---------------------------------------

/**
 * Score every plausible pair, then assign greedily best-first so each customer gets at
 * most one contact and each contact at most one customer — the two-sided uniqueness the
 * Rivhit script enforced with its paired `distinct on` passes.
 */
export function pairContacts(customers, contacts) {
  const byPhone = new Map();
  const byName = new Map();
  contacts.forEach((c, i) => {
    for (const p of c.phones) {
      const k = phoneKey9(p);
      if (!k) continue;
      if (!byPhone.has(k)) byPhone.set(k, new Set());
      byPhone.get(k).add(i);
    }
    const nk = nameKey(c.name);
    if (nk) {
      if (!byName.has(nk)) byName.set(nk, new Set());
      byName.get(nk).add(i);
    }
  });

  const candidates = [];
  for (const cu of customers) {
    const seen = new Set();
    const consider = (i, viaPhone) => {
      if (seen.has(i)) return;
      seen.add(i);
      const sim = nameSimilarity(cu.name, contacts[i].name);
      const score = (viaPhone ? 100 : 0) + sim * 50
        + (z(cu.city) && z(cu.city) === z(contacts[i].city) ? 5 : 0);
      // A phone match with a totally unrelated name is a shared line, not a person.
      if (viaPhone && sim === 0 && z(cu.name)) return;
      if (!viaPhone && sim < 0.999) return;
      candidates.push({ cu, ci: i, score, matchedBy: viaPhone ? 'טלפון' : 'שם' });
    };
    const pk = phoneKey9(cu.phone);
    if (pk && byPhone.has(pk)) for (const i of byPhone.get(pk)) consider(i, true);
    const nk = nameKey(cu.name);
    if (nk && byName.has(nk)) for (const i of byName.get(nk)) consider(i, false);
  }

  candidates.sort((a, b) => b.score - a.score);
  const usedCu = new Set(), usedCi = new Set();
  const pairs = [];
  for (const c of candidates) {
    if (usedCu.has(c.cu.id) || usedCi.has(c.ci)) continue;
    usedCu.add(c.cu.id); usedCi.add(c.ci);
    pairs.push(c);
  }
  return pairs;
}

