// One-time backfill: normalise customers whose `city` was saved in English/Latin
// (Google's `locality.long_name`, e.g. "Modi'in Makabim-Re'ut") to its Hebrew name,
// so area/sub-area resolution in the app stops dropping address-bearing customers into
// "לא משויך". New rows already store Hebrew (googleMapsConfig now loads the Maps API
// with language:'he'); this cleans rows saved before that.
//
// NOTE: the app already RESOLVES these rows correctly at display time via the Latin
// alias layer in src/lib/areas.ts (normalizeCity → CITY_ALIASES_LATIN). This script is
// data hygiene only — it rewrites the stored `city` value so the raw table is clean too.
//
// Hebrew spelling variants that don't match CBS (e.g. "בורגתא" vs "בורגתה") are handled
// by CITY_ALIASES in src/lib/areas.ts, not here. If a Hebrew city still shows under
// "לא משויך" in the app's "לפי אזור" view, add it to CITY_ALIASES / CITY_AREA there.
//
// Modes:
//   node scripts/backfill_city_hebrew.mjs --dry-run   # report Latin cities + counts, no writes
//   node scripts/backfill_city_hebrew.mjs             # offline rewrite via the alias map below
//   node scripts/backfill_city_hebrew.mjs --geocode   # authoritative: re-geocode place_id→Hebrew
//   node scripts/backfill_city_hebrew.mjs --emit-csv  # write city_backfill.csv (id,name,old,new), no writes
//
// Requires (writes): VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (RLS restricts writes).
// Requires (--geocode): GOOGLE_MAPS_API_KEY with the Geocoding API enabled.
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:GOOGLE_MAPS_API_KEY="..."
//   node scripts/backfill_city_hebrew.mjs --geocode
//
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const repo = join(__dir, '..');
const DRY = process.argv.includes('--dry-run');
const GEOCODE = process.argv.includes('--geocode');
const EMIT_CSV = process.argv.includes('--emit-csv');

function readEnv(file) {
  try {
    return Object.fromEntries(readFileSync(join(repo, file), 'utf8')
      .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  } catch { return {}; }
}

// Latin/English locality → Hebrew canonical. MIRRORS CITY_ALIASES_LATIN in
// src/lib/areas.ts — keep the two in sync (this file can't import the TS module).
const CITY_ALIASES_LATIN = {
  'modiin makabim reut': 'מודיעין',
  'modiin maccabim reut': 'מודיעין',
  'modiin': 'מודיעין',
  'tel aviv yafo': 'תל אביב',
  'tel aviv': 'תל אביב',
  'herzliya': 'הרצליה',
  'haifa': 'חיפה',
  'jerusalem': 'ירושלים',
  'beer sheva': 'באר שבע',
  'petah tikva': 'פתח תקווה',
  'raanana': 'רעננה',
  'kfar saba': 'כפר סבא',
  'netanya': 'נתניה',
  'rishon lezion': 'ראשון לציון',
  'rehovot': 'רחובות',
};
const canonicalizeLatin = (s) =>
  s.toLowerCase().replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const hasLatin = (s) => /[a-z]/i.test(s || '');

const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env };
const URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// Fetch all customers (paged; the table can exceed the default 1000-row cap).
async function fetchCustomers() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('customers')
      .select('id,name,city,address,lat,lng,place_id')
      .range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

// Re-geocode a place_id (fallback lat,lng) to its Hebrew locality via Google.
async function geocodeHebrewCity(row, gkey) {
  const base = 'https://maps.googleapis.com/maps/api/geocode/json';
  const q = row.place_id
    ? `place_id=${encodeURIComponent(row.place_id)}`
    : (row.lat != null && row.lng != null ? `latlng=${row.lat},${row.lng}` : null);
  if (!q) return null;
  const res = await fetch(`${base}?${q}&language=he&key=${gkey}`);
  const json = await res.json();
  if (json.status !== 'OK' || !json.results?.length) return null;
  for (const comp of json.results[0].address_components || []) {
    if (comp.types.includes('locality')) return comp.long_name;
  }
  return null;
}

const customers = await fetchCustomers();
const latinRows = customers.filter((c) => hasLatin(c.city));

// --- Report ---
const counts = new Map();
for (const c of latinRows) counts.set(c.city, (counts.get(c.city) || 0) + 1);
console.log(`Scanned ${customers.length} customers; ${latinRows.length} have a Latin city string:`);
for (const [city, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  const mapped = CITY_ALIASES_LATIN[canonicalizeLatin(city)];
  console.log(`  ${String(n).padStart(3)}  ${city}  ->  ${mapped ? mapped + ' (alias)' : GEOCODE ? '(geocode)' : 'UNMAPPED — add to CITY_ALIASES_LATIN'}`);
}

// Resolve the new Hebrew city for a row (offline alias, or --geocode).
async function resolveNewCity(row, gkey) {
  if (GEOCODE) return (await geocodeHebrewCity(row, gkey)) || CITY_ALIASES_LATIN[canonicalizeLatin(row.city)] || null;
  return CITY_ALIASES_LATIN[canonicalizeLatin(row.city)] || null;
}

if (EMIT_CSV || DRY) {
  const gkey = GEOCODE ? (process.env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY) : null;
  if (GEOCODE && !gkey) { console.error('--geocode needs GOOGLE_MAPS_API_KEY'); process.exit(1); }
  const changes = [];
  for (const row of latinRows) {
    const next = await resolveNewCity(row, gkey);
    if (next && next !== row.city) changes.push({ id: row.id, name: row.name, old: row.city, new: next });
  }
  if (EMIT_CSV) {
    const cell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = ['id,name,old_city,new_city', ...changes.map((c) => [c.id, c.name, c.old, c.new].map(cell).join(','))];
    const out = join(repo, 'city_backfill.csv');
    writeFileSync(out, '﻿' + lines.join('\r\n'));
    console.log(`\nWrote ${changes.length} proposed changes -> ${out}`);
  } else {
    console.log(`\ndry-run: ${changes.length} rows would change; nothing written.`);
  }
  process.exit(0);
}

// --- Write ---
const gkey = GEOCODE ? (process.env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY) : null;
if (GEOCODE && !gkey) { console.error('--geocode needs GOOGLE_MAPS_API_KEY'); process.exit(1); }
let updated = 0, skipped = 0;
for (const row of latinRows) {
  const next = await resolveNewCity(row, gkey);
  if (!next || next === row.city) { skipped++; continue; }
  const { error } = await db.from('customers').update({ city: next }).eq('id', row.id);
  if (error) { console.error(error); process.exit(1); }
  updated++;
  process.stdout.write(`\r  updated ${updated}`);
}
console.log(`\nDone. Updated ${updated}, skipped ${skipped} (no mapping / already Hebrew).`);
