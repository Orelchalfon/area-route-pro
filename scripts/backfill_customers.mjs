// One-time backfill: push every customer we hold in bundled files into the Supabase
// customers table so the table is the single source of truth and a full backup.
//
// Sources:
//   public/contacts.csv   — Outlook contacts export (name/phone/address/city/email)
//   public/calendar_1.ics — service calendar (name/city + filter_replacement_month + track)
//
// Idempotent: every row is upserted on import_key (= "name:<lowercased name>"), which
// matches customerImportKey() in src/hooks/useCustomers.ts, so re-running only updates.
// CSV is written first (richer contact fields); ICS is layered on top with only the
// fields it knows, so it never clobbers phone/address learned from the CSV.
//
// Requires the service-role key (RLS restricts writes to authenticated/service_role).
//
// Run (PowerShell, from repo root):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key from Supabase dashboard>"
//   node scripts/backfill_customers.mjs            # writes
//   node scripts/backfill_customers.mjs --dry-run  # counts only, no writes
//
// No service-role key? Generate a table-shaped CSV to import via the Supabase
// dashboard (Table Editor -> customers -> Import) instead:
//   node scripts/backfill_customers.mjs --emit-csv  # writes customers_import.csv
//
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const repo = join(__dir, '..');
const DRY = process.argv.includes('--dry-run');
const EMIT_JSON = process.argv.includes('--emit-json'); // print parsed rows as JSON, no DB needed
const EMIT_CSV = process.argv.includes('--emit-csv');   // write customers_import.csv, no DB needed

function readEnv(file) {
  try {
    return Object.fromEntries(readFileSync(join(repo, file), 'utf8')
      .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  } catch { return {}; }
}

const importKey = (name) => `name:${name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
const clean = (v) => (v || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
const extractPhone = (raw) => { const m = (raw || '').match(/[\d\-()+]{7,}/); return m ? m[0].trim() : ''; };

// --- RFC-4180 CSV parser (mirrors src/lib/csvParser.ts) ---
function parseCSV(text) {
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

function customersFromCSV() {
  let rows;
  try { rows = parseCSV(readFileSync(join(repo, 'public/contacts.csv'), 'utf8')); }
  catch { console.warn('public/contacts.csv not found — skipping CSV'); return []; }
  if (rows.length < 2) return [];
  const head = rows[0].map(h => h.replace(/^﻿/, '').trim());
  const idx = (name) => head.indexOf(name);
  const iFirst = idx('First Name'), iMid = idx('Middle Name'), iLast = idx('Last Name');
  const iEmail = idx('E-mail Address');
  const phoneCols = ['Mobile Phone', 'Home Phone', 'Business Phone', 'Other Phone', 'Primary Phone'].map(idx);
  const iHomeStreet = idx('Home Street'), iBizStreet = idx('Business Street');
  const iHomeCity = idx('Home City'), iBizCity = idx('Business City');

  const out = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (j) => (j >= 0 && j < r.length ? clean(r[j]) : '');
    const name = [get(iFirst), get(iMid), get(iLast)].filter(Boolean).join(' ').trim();
    if (!name) continue;
    let phone = '';
    for (const j of phoneCols) { const p = extractPhone(get(j)); if (p) { phone = p; break; } }
    if (!phone) continue; // mirror CSV import: skip contacts without a phone
    const address = get(iHomeStreet) || get(iBizStreet);
    const city = get(iHomeCity) || get(iBizCity);
    out.set(importKey(name), {
      import_key: importKey(name),
      name,
      phone,
      address: address || null,
      city: city || null,
      email: get(iEmail) || null,
      filter_replacement_month: 0,
      source: 'import',
    });
  }
  return [...out.values()];
}

// --- ICS parser (mirrors src/lib/icsParser.ts, but keeps ALL events incl. past) ---
function extractCustomerName(summary) {
  const s = summary.trim();
  const dash = s.search(/[-–—]/);
  if (dash > 0) return s.substring(0, dash).replace(/[,\-–—]+$/, '').trim();
  const kws = ['תלת', 'חוץ', 'ביקור שירות', 'פ.מ.ב', 'BB', 'בייפס', 'RO', 'מרכך', 'מהדר', 'סיליפוס', 'ח+ס', 'חוזה שירות', 'ASF', 'תמד'];
  for (const kw of kws) { const k = s.indexOf(kw); if (k > 0) return s.substring(0, k).replace(/[,\-–—]+$/, '').trim(); }
  return s.replace(/[,\-–—]+$/, '').trim();
}
function detectServiceTrack(s) {
  if (/ביקור שירות|אספקת מלח/.test(s)) return 'service_visit';
  if (/בייפס|סיליפוס|ח\+ס/.test(s)) return 'bypass_siliphos';
  if (/חוץ|פ\.מ\.ב/.test(s)) return 'external_filter';
  return 'annual_filter';
}
function detectProduct(s) {
  if (/RO/i.test(s)) return 'מערכת אוסמוזה';
  if (/מיני בר/.test(s)) return 'מיני בר';
  if (/תלת/.test(s)) return 'פילטר תלת';
  if (/BB/.test(s)) return 'פילטר BB';
  if (/ASF/.test(s)) return 'פילטר ASF';
  if (/בייפס|סיליפוס/.test(s)) return 'בייפס/סיליפוס';
  if (/מהדר/.test(s)) return 'מהדר מים';
  if (/חוץ/.test(s)) return 'פילטר חוץ';
  return 'מערכת סינון';
}

function customersFromICS() {
  let text;
  try { text = readFileSync(join(repo, 'public/calendar_1.ics'), 'utf8'); }
  catch { console.warn('public/calendar_1.ics not found — skipping ICS'); return []; }
  const lines = text.split(/\r?\n/);
  const events = []; let cur = null, lastKey = '';
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; lastKey = ''; continue; }
    if (line === 'END:VEVENT') { if (cur?.summary && cur?.dtstart) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (line.startsWith(' ') || line.startsWith('\t')) { if (lastKey === 'summary') cur.summary = (cur.summary || '') + line.trim(); continue; }
    if (line.startsWith('SUMMARY:')) { cur.summary = line.substring(8).trim(); lastKey = 'summary'; }
    else if (line.startsWith('DTSTART')) { cur.dtstart = line.split(':').slice(1).join(':').trim(); lastKey = 'dtstart'; }
    else if (line.startsWith('LOCATION:')) { cur.location = line.substring(9).trim(); lastKey = 'location'; }
    else lastKey = '';
  }
  const out = new Map();
  for (const ev of events) {
    const m = (ev.dtstart || '').replace(/;.*$/, '').match(/(\d{4})(\d{2})(\d{2})/);
    const month = m ? parseInt(m[2], 10) : 0;
    const name = extractCustomerName(ev.summary);
    if (!name || name.length < 2) continue;
    const city = clean(ev.location);
    // First event per customer wins (avoids overwriting an earlier month arbitrarily).
    if (out.has(importKey(name))) continue;
    out.set(importKey(name), {
      import_key: importKey(name),
      name,
      city: city || null,
      product: detectProduct(ev.summary),
      service_track: detectServiceTrack(ev.summary),
      filter_replacement_month: month || 0,
      source: 'import',
    });
  }
  return [...out.values()];
}

const csvRows = customersFromCSV();
const icsRows = customersFromICS();

// Merge CSV (richer contact info) with ICS (service month/track), deduped on
// import_key. ICS only fills fields the CSV row lacks — it never clobbers known
// phone/address. Mirrors the two-phase DB upsert below in a single array.
function mergeRows() {
  const map = new Map();
  for (const r of csvRows) map.set(r.import_key, { ...r });
  for (const r of icsRows) {
    const ex = map.get(r.import_key);
    if (!ex) { map.set(r.import_key, { ...r }); continue; }
    if (!ex.city && r.city) ex.city = r.city;
    if (!ex.product && r.product) ex.product = r.product;
    if (!ex.service_track && r.service_track) ex.service_track = r.service_track;
    if ((!ex.filter_replacement_month || ex.filter_replacement_month === 0) && r.filter_replacement_month) {
      ex.filter_replacement_month = r.filter_replacement_month;
    }
  }
  return [...map.values()];
}

if (EMIT_JSON) {
  // No DB credentials needed — just print the parsed rows (CSV first, then ICS).
  process.stdout.write(JSON.stringify({ csv: csvRows, ics: icsRows }));
  process.exit(0);
}

if (EMIT_CSV) {
  // No DB credentials needed — write a CSV whose headers match the customers table
  // 1:1, ready to drag into Supabase Table Editor → Import. import_key dedupes.
  const cols = ['name', 'phone', 'address', 'city', 'email', 'product', 'service_track', 'filter_replacement_month', 'import_key', 'source'];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = mergeRows();
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map(c => cell(r[c])).join(','));
  const out = join(repo, 'customers_import.csv');
  // Prepend a UTF-8 BOM so Excel/Supabase read the Hebrew correctly.
  writeFileSync(out, '﻿' + lines.join('\r\n'));
  console.log(`Wrote ${rows.length} customers -> ${out}`);
  process.exit(0);
}

const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env };
const URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(URL, KEY, { auth: { persistSession: false } });

async function upsert(rows, label) {
  console.log(`${label}: ${rows.length} customers`);
  if (DRY || rows.length === 0) return;
  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from('customers').upsert(chunk, { onConflict: 'import_key' });
    if (error) { console.error(error); process.exit(1); }
    written += chunk.length; process.stdout.write(`\r  written ${written}/${rows.length}`);
  }
  console.log('');
}

await upsert(csvRows, 'CSV contacts');
await upsert(icsRows, 'ICS calendar');
if (DRY) console.log('dry-run: nothing written');
else console.log('Done.');
