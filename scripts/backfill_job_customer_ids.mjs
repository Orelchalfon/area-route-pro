// Link existing malfunction / installation rows to a real customer.
//
// These two tables never had a customer reference: the app synthesises one customer per
// ROW (db-malf-cust-{row}), so the same person's תקלות are unrelated "customers" and
// none of them show up in that person's history. The 20260824120100 migration adds a
// nullable customer_id; this fills it in for rows that already exist.
//
// NOTHING IS WRITTEN WITHOUT --apply. The dry run produces a workbook to review, and
// only rows the matcher is confident about are ever proposed.
//
//   node scripts/backfill_job_customer_ids.mjs                 # dry run + report
//   node scripts/backfill_job_customer_ids.mjs --apply
//   node scripts/backfill_job_customer_ids.mjs --restore <snapshot.json>
//
// RUN THIS ONLY AFTER THE DUPLICATE-CUSTOMER MERGES LAND. Matching against a list that
// still contains ~293 known duplicates would attach visits to the shadow copy of a
// customer and freeze that mistake into the schema. scripts/dedupe_customers.mjs first.
//
// Matching rule, deliberately strict — an unlinked row costs nothing (the app falls back
// to phone/name matching at read time), a WRONGLY linked row shows one person another
// person's visits:
//   1. phone (last 9 digits) matches exactly one customer            -> link
//   2. no usable phone, and the normalised name matches exactly one  -> link
//   3. anything ambiguous or unmatched                               -> reported, skipped

import {
  fetchAll,
  patchRow,
  stamp,
  writeCsv,
  writeSnapshot,
  loadSnapshot,
} from './customerDb.mjs';
import { phoneKey9, nameKey } from './customerMatch.mjs';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const RESTORE = (() => {
  const i = argv.indexOf('--restore');
  return i === -1 ? null : argv[i + 1];
})();

const TABLES = ['malfunctions', 'installations'];
const z = (v) => (v === null || v === undefined ? '' : String(v).trim());

// --- restore ------------------------------------------------------------------
if (RESTORE) {
  const snap = loadSnapshot(RESTORE);
  console.log(`Restoring ${snap.rows.length} rows from ${RESTORE}...`);
  for (const r of snap.rows) {
    await patchRow(r.table, r.id, { customer_id: r.customer_id });
  }
  console.log('Done. customer_id restored to its pre-run value on every row.');
  process.exit(0);
}

// --- load ---------------------------------------------------------------------
const customers = await fetchAll('customers', 'id,name,phone');

// Index customers by the two natural keys. A key that resolves to more than one
// customer is USELESS for linking, so it is dropped rather than guessed at.
const byPhone = new Map();
const byName = new Map();
for (const c of customers) {
  const pk = phoneKey9(c.phone);
  if (pk) {
    if (byPhone.has(pk)) byPhone.set(pk, null);
    else byPhone.set(pk, c);
  }
  const nk = nameKey(c.name);
  if (nk) {
    if (byName.has(nk)) byName.set(nk, null);
    else byName.set(nk, c);
  }
}

const proposals = [];
const unmatched = [];

for (const table of TABLES) {
  const rows = await fetchAll(table, 'id,customer_name,phone,city,customer_id');
  for (const row of rows) {
    if (row.customer_id) continue; // already linked — never re-point an existing link

    const pk = phoneKey9(row.phone);
    let match = null;
    let via = '';

    if (pk) {
      const hit = byPhone.get(pk);
      if (hit) {
        match = hit;
        via = 'טלפון';
      } else if (byPhone.has(pk)) {
        unmatched.push({ table, row, reason: 'טלפון משותף לכמה לקוחות' });
        continue;
      }
    }

    // Name is a fallback only. Two people genuinely share a name often enough that
    // using it while a phone exists would create wrong links.
    if (!match && !pk) {
      const nk = nameKey(row.customer_name);
      const hit = nk ? byName.get(nk) : null;
      if (hit) {
        match = hit;
        via = 'שם';
      } else if (nk && byName.has(nk)) {
        unmatched.push({ table, row, reason: 'שם משותף לכמה לקוחות' });
        continue;
      }
    }

    if (match) {
      proposals.push({ table, row, customer: match, via });
    } else {
      unmatched.push({
        table,
        row,
        reason: pk ? 'לא נמצא לקוח עם הטלפון הזה' : 'אין טלפון ואין התאמת שם',
      });
    }
  }
}

// --- report -------------------------------------------------------------------
const when = stamp();
const TABLE_LABEL = { malfunctions: 'תקלות', installations: 'התקנות' };

writeCsv(
  `job_customer_links_${when}.csv`,
  ['טבלה', 'מזהה שורה', 'שם בשורה', 'טלפון בשורה', 'לקוח מתאים', 'טלפון לקוח', 'לפי', 'מזהה לקוח'],
  proposals.map((p) => [
    TABLE_LABEL[p.table],
    p.row.id,
    z(p.row.customer_name),
    z(p.row.phone),
    z(p.customer.name),
    z(p.customer.phone),
    p.via,
    p.customer.id,
  ]),
);

writeCsv(
  `job_customer_unmatched_${when}.csv`,
  ['טבלה', 'מזהה שורה', 'שם בשורה', 'טלפון בשורה', 'עיר', 'סיבה'],
  unmatched.map((u) => [
    TABLE_LABEL[u.table],
    u.row.id,
    z(u.row.customer_name),
    z(u.row.phone),
    z(u.row.city),
    u.reason,
  ]),
);

const byVia = proposals.reduce((acc, p) => ({ ...acc, [p.via]: (acc[p.via] || 0) + 1 }), {});
console.log(`\nלקוחות במערכת: ${customers.length}`);
console.log(`מוצעים לקישור: ${proposals.length}  (${JSON.stringify(byVia)})`);
console.log(`לא נמצאה התאמה: ${unmatched.length}`);
console.log(`\nדוחות נכתבו עם החותמת ${when}.`);

if (!APPLY) {
  console.log('\nהרצה יבשה בלבד — לא נכתב דבר. הריצו שוב עם --apply כדי לבצע.');
  process.exit(0);
}

// --- apply --------------------------------------------------------------------
// Snapshot BEFORE writing so --restore can put every touched row back exactly.
const snapshotPath = writeSnapshot(`job_customer_ids_${when}.json`, {
  rows: proposals.map((p) => ({
    table: p.table,
    id: p.row.id,
    customer_id: p.row.customer_id ?? null,
  })),
});
console.log(`\nגיבוי נשמר: ${snapshotPath}`);

let done = 0;
for (const p of proposals) {
  await patchRow(p.table, p.row.id, { customer_id: p.customer.id });
  done += 1;
  if (done % 100 === 0) console.log(`  ...${done}/${proposals.length}`);
}
console.log(`\nהושלם: ${done} שורות קושרו ללקוח.`);
console.log(`לביטול מלא: node scripts/backfill_job_customer_ids.mjs --restore ${snapshotPath}`);
