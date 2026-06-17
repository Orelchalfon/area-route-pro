// One-off transform for the historical spreadsheet import.
// Reads the two attached sheets, maps them to the `installations` / `malfunctions`
// table shapes, and emits review summaries + JSON + batched SQL.
//
// Usage: node scripts/import/transformSheets.mjs
//
// Region/column mappings are derived from city evidence in the data (the export's
// merged-cell band labels are misaligned). See the approved plan for details.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

const INSTALL_FILE = join(REPO, 'sheets', 'התקנות מידיות  - התקנות .csv');
const MALF_FILE = join(REPO, 'sheets', 'טבלה תקלות- שירות - גיליון1.csv');

// ---- RFC-style CSV parser (handles quoted multi-line fields) ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(field); field = '';
        rows.push(row); row = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- helpers ----
function parseDate(raw) {
  if (!raw) return { date: null, raw: '' };
  const original = raw.trim();
  const cleaned = original.replace(/\s+/g, '').replace('מיידי', '').replace(/[^\d./]/g, '');
  if (!cleaned) return { date: null, raw: original };

  let m = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    if (year.length === 3) return { date: null, raw: original };
    if (+day >= 1 && +day <= 31 && +month >= 1 && +month <= 12) {
      return { date: `${year}-${month}-${day}`, raw: original };
    }
    return { date: null, raw: original };
  }
  m = cleaned.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    if (+day >= 1 && +day <= 31 && +month >= 1 && +month <= 12) {
      return { date: `2026-${month}-${day}`, raw: original };
    }
    return { date: null, raw: original };
  }
  return { date: null, raw: original };
}

function extractPhone(text) {
  if (!text) return '';
  const candidates = text.match(/0\d[\d\- ]{6,}\d/g);
  if (!candidates) return '';
  for (const c of candidates) {
    const digits = c.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 10) return digits;
  }
  return '';
}

function stripPhones(name) {
  return name.replace(/0\d[\d\- ]{6,}\d/g, '').replace(/\s+/g, ' ').trim();
}

function clean(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

function isJunkName(name) {
  const n = clean(name);
  if (!n || n === '-' || n.length < 2) return true;
  if (n === 'שם' || n === 'שם ') return true;
  return false;
}

function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ---- installations ----
const INST_GROUPS = [
  { region: 'גוש דן', name: 0, date: 1, city: 2, addr: 3, mobile: 4, product: 5, notes: 6 },
  { region: 'ירושלים', name: 7, date: 8, city: 9, addr: 10, mobile: 11, product: 12, notes: 13 },
  { region: 'דרום', name: 14, date: 15, city: 16, addr: 17, mobile: 18, product: 19, notes: 20 },
  { region: 'צפון', name: 21, date: 22, city: 23, addr: 24, mobile: 25, product: 26, notes: 27 },
  { region: 'השומרון', name: 28, date: null, city: 29, addr: 30, mobile: 32, product: 31, notes: 33 },
];

function transformInstallations() {
  const rows = parseCSV(readFileSync(INSTALL_FILE, 'utf8'));
  const out = [];
  let nullDates = 0;
  const byRegion = {};
  // band row 0, header row 1, data from row 2
  for (let r = 2; r < rows.length; r++) {
    const cols = rows[r];
    for (const g of INST_GROUPS) {
      const name = clean(cols[g.name]);
      const city = clean(cols[g.city]);
      const product = clean(cols[g.product]);
      const notesCol = clean(cols[g.notes]);
      if (isJunkName(name)) continue;
      if (!city && !product && !notesCol) continue;

      const rawDate = g.date === null ? '' : clean(cols[g.date]);
      const { date, raw } = parseDate(rawDate);
      if (!date && rawDate) nullDates++;

      const phone = extractPhone(clean(cols[g.mobile])) || extractPhone(name + ' ' + notesCol);
      const notesParts = [];
      if (notesCol) notesParts.push(notesCol);
      if (!date && rawDate) notesParts.push(`תאריך מקורי: ${raw}`);

      const row = {
        customer_name: stripPhones(name),
        city: city.replace(/[/,]$/, '').trim(),
        address: clean(cols[g.addr]) || null,
        phone: phone || null,
        product_type: product || null,
        region: g.region,
        installation_date: date,
        notes: notesParts.length ? notesParts.join(' | ') : null,
        status: 'pending',
        source: 'import',
        sheet_row_id: `import-inst:${g.region}:${r}`,
      };
      out.push(row);
      byRegion[g.region] = (byRegion[g.region] || 0) + 1;
    }
  }
  return { rows: out, nullDates, byRegion };
}

// ---- malfunctions ----
const MALF_GROUPS = [
  { region: 'גוש דן', name: 0, city: 1, phone: 2, desc: 3, date: 4 },
  { region: 'צפון', name: 5, city: 6, phone: 7, desc: 8, date: 9 },
  { region: 'דרום', name: 10, city: 11, phone: 12, desc: 13, date: 14 },
  { region: 'ירושלים', name: 15, city: 16, phone: 17, desc: 18, date: 19 },
  { region: 'השומרון', name: 20, city: 21, phone: 22, desc: 23, date: 24 },
];

function transformMalfunctions() {
  const rows = parseCSV(readFileSync(MALF_FILE, 'utf8'));
  const out = [];
  let nullDates = 0;
  const byRegion = {};
  // band row 0, blank row 1, header row 2, data from row 3
  for (let r = 3; r < rows.length; r++) {
    const cols = rows[r];
    for (const g of MALF_GROUPS) {
      const name = clean(cols[g.name]);
      const city = clean(cols[g.city]);
      const desc = clean(cols[g.desc]);
      if (isJunkName(name)) continue;
      if (!city && !desc) continue;

      const rawDate = clean(cols[g.date]);
      const { date, raw } = parseDate(rawDate);
      if (!date && rawDate) nullDates++;

      const phone = extractPhone(clean(cols[g.phone])) || extractPhone(name + ' ' + desc);
      const notesParts = [];
      if (!date && rawDate) notesParts.push(`תאריך מקורי: ${raw}`);

      const row = {
        customer_name: stripPhones(name),
        city: city.replace(/[/,]$/, '').trim(),
        address: null,
        phone: phone || null,
        description: desc || null,
        region: g.region,
        malfunction_date: date,
        notes: notesParts.length ? notesParts.join(' | ') : null,
        status: 'pending',
        source: 'import',
        sheet_row_id: `import-malf:${g.region}:${r}`,
      };
      out.push(row);
      byRegion[g.region] = (byRegion[g.region] || 0) + 1;
    }
  }
  return { rows: out, nullDates, byRegion };
}

// ---- SQL emit ----
function buildSQL(table, rows, cols, batchSize = 100) {
  const statements = [`DELETE FROM public.${table} WHERE source = 'import';`];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch
      .map(row => `(${cols.map(c => sqlStr(row[c])).join(', ')})`)
      .join(',\n  ');
    statements.push(
      `INSERT INTO public.${table} (${cols.join(', ')}) VALUES\n  ${values};`
    );
  }
  return statements.join('\n\n');
}

// ---- run ----
const inst = transformInstallations();
const malf = transformMalfunctions();

const INST_COLS = ['customer_name', 'city', 'address', 'phone', 'product_type', 'region', 'installation_date', 'notes', 'status', 'source', 'sheet_row_id'];
const MALF_COLS = ['customer_name', 'city', 'address', 'phone', 'description', 'region', 'malfunction_date', 'notes', 'status', 'source', 'sheet_row_id'];

writeFileSync(join(OUT, 'installations.json'), JSON.stringify(inst.rows, null, 2), 'utf8');
writeFileSync(join(OUT, 'malfunctions.json'), JSON.stringify(malf.rows, null, 2), 'utf8');
writeFileSync(join(OUT, 'installations.sql'), buildSQL('installations', inst.rows, INST_COLS), 'utf8');
writeFileSync(join(OUT, 'malfunctions.sql'), buildSQL('malfunctions', malf.rows, MALF_COLS), 'utf8');

function summary(label, res) {
  console.log(`\n=== ${label} ===`);
  console.log(`total rows: ${res.rows.length}`);
  console.log(`region distribution:`, res.byRegion);
  console.log(`rows with NULL/unparseable date: ${res.nullDates}`);
  console.log(`sample (first 4):`);
  for (const row of res.rows.slice(0, 4)) console.log('  ', JSON.stringify(row));
}

summary('INSTALLATIONS → installations', inst);
summary('MALFUNCTIONS → malfunctions', malf);
console.log(`\nWrote JSON + SQL to ${OUT}`);
