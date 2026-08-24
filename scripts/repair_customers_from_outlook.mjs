// Enrich customer contact details from a fresh Outlook contacts export, and push the
// result through to the job rows the board actually renders.
//
// Scope check, measured against the live table: of 1,692 customers with no address,
// Outlook's street is blank for 1,291 of them and absent entirely for 259. Of the 157
// that do have one, it sits on a contact whose name actually matches the customer in
// only 37 cases — for the other 120 the street belongs to a different person sharing
// the line, which is a review item, not a fill. So the honest yield here is ~100
// customers and ~120 fields. This pass is worth running, but it is not the fix for the
// list feeling broken — de-duplication (scripts/dedupe_customers.mjs) is. Run this
// AFTER that, so it enriches the survivors rather than the twins.
//
//   node scripts/repair_customers_from_outlook.mjs <export.csv>
//   node scripts/repair_customers_from_outlook.mjs <export.csv> --apply
//   node scripts/repair_customers_from_outlook.mjs --restore <snapshot.json>

import { readFileSync } from 'node:fs';
import {
  fetchAll, patchRow, stamp, writeCsv, writeSnapshot, loadSnapshot,
} from './customerDb.mjs';
import {
  parseCSVRecords, phoneKeyApp, importKeyOf, classifyField, isProtectedRow,
  buildContacts, pairContacts,
} from './customerMatch.mjs';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ri = argv.indexOf('--restore');
const RESTORE = ri === -1 ? null : argv[ri + 1];
const EXPORT = argv.find((a) => !a.startsWith('--') && a !== RESTORE);

const z = (v) => (v === null || v === undefined ? '' : String(v).trim());
const FIELDS = ['phone', 'address', 'city', 'email'];

/**
 * Reproduces resolveCustomerCard (src/lib/customerCardMatch.ts:28-52) against the
 * PRE-repair state. Built before any write: repairing a customer's phone while the job
 * row keeps the old one would otherwise silently break a link that resolves today.
 */
function resolveJobCards(jobs, customers) {
  const byImportKey = new Map();
  const byPhone = new Map();
  for (const c of customers) {
    const k = importKeyOf(c.name);
    if (!byImportKey.has(k)) byImportKey.set(k, c);
    const p = phoneKeyApp(c.phone);
    if (p && !byPhone.has(p)) byPhone.set(p, c);
  }
  const out = [];
  for (const j of jobs) {
    let card = null;
    // ongoing_services rows derived from the calendar carry a task description in
    // customer_name, so they must never match by name.
    if (!j.nameIsDescription && z(j.customer_name)) card = byImportKey.get(importKeyOf(j.customer_name)) || null;
    if (!card) {
      const p = phoneKeyApp(j.phone);
      if (p) card = byPhone.get(p) || null;
    }
    if (card) out.push({ job: j, card });
  }
  return out;
}

// --- main ------------------------------------------------------------------------

if (RESTORE) {
  const snap = loadSnapshot(RESTORE);
  for (const r of snap.customers) {
    const { id, ...rest } = r;
    await patchRow('customers', id, rest);
  }
  for (const r of snap.jobs) {
    const { table, id, ...rest } = r;
    await patchRow(table, id, rest);
  }
  console.log(`restored ${snap.customers.length} customers and ${snap.jobs.length} job rows`);
  process.exit(0);
}

if (!EXPORT) {
  console.error('Usage: node scripts/repair_customers_from_outlook.mjs <outlook-export.csv> [--apply]');
  process.exit(1);
}

const contacts = buildContacts(parseCSVRecords(readFileSync(EXPORT, 'utf8')));
const customers = await fetchAll('customers', '*');
const [malfunctions, installations, ongoing] = await Promise.all([
  fetchAll('malfunctions', 'id,customer_name,phone,city,address'),
  fetchAll('installations', 'id,customer_name,phone,city,address'),
  fetchAll('ongoing_services', 'id,customer_name,phone,city,address,customer_id'),
]);

const jobs = [
  ...malfunctions.map((j) => ({ ...j, table: 'malfunctions' })),
  ...installations.map((j) => ({ ...j, table: 'installations' })),
  ...ongoing.map((j) => ({ ...j, table: 'ongoing_services', nameIsDescription: !j.customer_id })),
];

const pairs = pairContacts(customers, contacts);
const jobCards = resolveJobCards(jobs, customers);

// --- classify --------------------------------------------------------------------

const counts = {};
const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
const customerWrites = new Map();
const conflicts = [];

for (const { cu, ci, matchedBy } of pairs) {
  const c = contacts[ci];
  const incoming = { phone: c.phones[0] || '', address: c.address, city: c.city, email: c.email };
  const ctx = { city: cu.city, protected: isProtectedRow(cu) };
  for (const f of FIELDS) {
    const verdict = classifyField(f, cu[f], incoming[f], ctx);
    bump(`${f}:${verdict}`);
    if (verdict === 'fill' || verdict === 'repair') {
      if (!customerWrites.has(cu.id)) customerWrites.set(cu.id, { row: cu, patch: {} });
      customerWrites.get(cu.id).patch[f] = z(incoming[f]);
    } else if (verdict === 'conflict') {
      conflicts.push([cu.name, z(cu.phone), z(incoming.phone), z(cu.address), z(incoming.address),
        z(cu.city), z(incoming.city), matchedBy, cu.id]);
    }
  }
}

// Any address/city change must clear the stored coordinates so the app re-geocodes
// (mirrors shouldResetStoredCoords, src/hooks/useJobs.ts:61).
for (const w of customerWrites.values()) {
  if (w.patch.address || w.patch.city) {
    w.patch.lat = null; w.patch.lng = null; w.patch.place_id = null;
  }
}

// Stage C: the same enriched values, pushed onto the job rows that render on the board.
const jobWrites = [];
for (const { job, card } of jobCards) {
  const w = customerWrites.get(card.id);
  if (!w) continue;
  const patch = {};
  for (const f of ['phone', 'address', 'city']) {
    if (w.patch[f] === undefined) continue;
    if (classifyField(f, job[f], w.patch[f], { city: job.city }) === 'skip') continue;
    patch[f] = w.patch[f];
  }
  if (Object.keys(patch).length) jobWrites.push({ table: job.table, id: job.id, job, patch });
}

// --- report ----------------------------------------------------------------------

console.log(`outlook contacts .......... ${contacts.length} (after collapsing its own duplicates)`);
console.log(`customers ................. ${customers.length}`);
console.log(`paired .................... ${pairs.length}  ` +
  `(phone ${pairs.filter((p) => p.matchedBy === 'טלפון').length}, name ${pairs.filter((p) => p.matchedBy === 'שם').length})`);
console.log('');
for (const f of FIELDS) {
  console.log(`${f.padEnd(8)} fill ${String(counts[`${f}:fill`] || 0).padStart(4)} | ` +
    `repair ${String(counts[`${f}:repair`] || 0).padStart(3)} | ` +
    `conflict ${String(counts[`${f}:conflict`] || 0).padStart(4)} | ` +
    `skip ${String(counts[`${f}:skip`] || 0).padStart(5)}`);
}
console.log(`\ncustomers to update ....... ${customerWrites.size}`);
console.log(`job rows to update ........ ${jobWrites.length}  (of ${jobCards.length} resolved to a card)`);

const ts = stamp();
const conflictPath = writeCsv(
  `review_conflicts_${ts}.csv`,
  ['שם', 'טלפון במערכת', 'טלפון באאוטלוק', 'כתובת במערכת', 'כתובת באאוטלוק',
    'עיר במערכת', 'עיר באאוטלוק', 'איך הותאם', 'מזהה'],
  conflicts,
);
console.log(`\ndisagreements for review (${conflicts.length}) -> ${conflictPath}`);

if (!APPLY) {
  console.log('\ndry run — nothing written. Re-run with --apply to write.');
  process.exit(0);
}

// --- apply -----------------------------------------------------------------------

const snapPath = writeSnapshot(`restore_outlook_${ts}.json`, {
  kind: 'outlook-repair',
  created_at: new Date().toISOString(),
  customers: [...customerWrites.values()].map(({ row }) => ({
    id: row.id, phone: row.phone, address: row.address, city: row.city,
    email: row.email, lat: row.lat, lng: row.lng, place_id: row.place_id,
  })),
  jobs: jobWrites.map(({ table, id, job }) => ({
    table, id, phone: job.phone, address: job.address, city: job.city,
  })),
});
console.log(`snapshot written -> ${snapPath}`);

let n = 0;
for (const { row, patch } of customerWrites.values()) {
  await patchRow('customers', row.id, { ...patch, source: 'app' });
  n++;
}
let m = 0;
for (const { table, id, patch } of jobWrites) {
  // Never set `source` on job updates — an RLS trigger rejects it (dbJobSync.ts:141-144).
  await patchRow(table, id, patch);
  m++;
}
console.log(`updated ${n} customers and ${m} job rows`);
console.log(`undo with:  node scripts/repair_customers_from_outlook.mjs --restore ${snapPath}`);
