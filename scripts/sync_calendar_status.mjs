// Sync calendar completion status -> public.ongoing_services (binary בוצע / לא בוצע).
//
// Source of truth: sheets/calendar_fixed.csv (Outlook export). An event counts as
// done when its קטגוריות column contains the tag 'בוצע'. Each ongoing_services row is
// matched to the calendar on (service_date + leading customer name) — the two data
// sets share only the customer name, not the full description. Matched-done rows get
// 'בוצע', everything else (incl. future / unperformed visits) gets 'לא בוצע'.
//
// Requires the service-role key because RLS restricts writes to authenticated/service_role.
//
// Apply the column migration first (adds category/is_done/status_label):
//   supabase db push        # or paste the migration SQL in the SQL Editor
//
// Run (PowerShell, from repo root):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key from Supabase dashboard>"
//   node scripts/sync_calendar_status.mjs            # writes
//   node scripts/sync_calendar_status.mjs --dry-run  # counts only, no writes
//
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
const repo = join(__dir, '..');
const DRY = process.argv.includes('--dry-run');

// --- read env (.env has VITE_SUPABASE_URL; service key comes from process.env) ---
function readEnv(file) {
  try {
    return Object.fromEntries(readFileSync(join(repo, file), 'utf8')
      .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  } catch { return {}; }
}
const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env };
const URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false } });

// --- minimal RFC-4180 CSV parser ---
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, j) => [h, r[j]])));
}

// Calendar export uses US M/D/YYYY (e.g. 6/15/2026 = 15 Jun 2026) -> ISO YYYY-MM-DD.
const toISO = (s) => { const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` : null; };
// Calendar subjects are install events ("שם-התקנת…") while ongoing_services rows are
// service-cycle tasks ("שם -חוץ" / "שם BB" / "שם -RO"). They never share a full
// description, only the leading CUSTOMER NAME — so match on (name + exact date). The
// name is the text before the first '-' or '(', with whitespace collapsed.
const nameOf = (s) => (s || '').split(/[-(]/)[0].replace(/\s+/g, ' ').trim();
const key = (date, name) => `${date}|${name}`;

// --- load CSV and collect (date, customer-name) keys of completed events ---
// Outlook export headers: נושא=subject, תאריך התחלה=start date, קטגוריות=categories.
const csv = parseCSV(readFileSync(join(repo, 'sheets/calendar_fixed.csv'), 'utf8'));
const doneKeys = new Set();
let doneEvents = 0;
for (const r of csv) {
  const iso = toISO(r['תאריך התחלה']); if (!iso) continue;
  const cats = (r['קטגוריות'] || '').split(';').map(c => c.trim());
  if (!cats.includes('בוצע')) continue;     // not marked done
  const name = nameOf(r['נושא']); if (name.length < 2) continue;
  doneKeys.add(key(iso, name));
  doneEvents++;
}
console.log(`calendar done events: ${doneEvents} | unique done (date,name) keys: ${doneKeys.size}`);

// --- page through ongoing_services and assign a binary status to every row ---
const updates = []; const matchedKeys = new Set();
let from = 0, done = 0, total = 0; const PAGE = 1000;
for (;;) {
  const { data, error } = await db.from('ongoing_services')
    .select('id, service_date, task_description').range(from, from + PAGE - 1);
  if (error) { console.error(error); process.exit(1); }
  if (!data.length) break;
  total += data.length;
  for (const o of data) {
    const k = key(o.service_date, nameOf(o.task_description));
    const isDone = doneKeys.has(k);
    if (isDone) { done++; matchedKeys.add(k); }
    updates.push({
      id: o.id,
      service_date: o.service_date,
      task_description: o.task_description,
      category: isDone ? 'בוצע' : null,
      is_done: isDone,
      status_label: isDone ? 'בוצע' : 'לא בוצע',
      status_synced_at: new Date().toISOString(),
    });
  }
  from += PAGE;
}
console.log(`ongoing_services rows: ${total} | בוצע: ${done} | לא בוצע: ${total - done}`);
console.log(`calendar done keys with no matching service row: ${doneKeys.size - matchedKeys.size}`);
if (DRY) { console.log('dry-run: nothing written'); process.exit(0); }

// --- write back in batches (upsert on id = update existing) ---
let written = 0;
for (let i = 0; i < updates.length; i += 500) {
  const chunk = updates.slice(i, i + 500);
  const { error } = await db.from('ongoing_services').upsert(chunk, { onConflict: 'id' });
  if (error) { console.error(error); process.exit(1); }
  written += chunk.length; process.stdout.write(`\rwritten ${written}/${updates.length}`);
}
console.log(`\nDone. Updated ${written} rows.`);
