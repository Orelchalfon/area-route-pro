// De-duplicate the customer list after the 27/07/2026 Rivhit import.
//
// The import never overwrote anything (merge_rivhit_customers.sql only ever does
// coalesce(nullif(existing,''), rivhit)); what it did was add 1,362 receipt-derived
// rows, ~293 of which shadow a customer that already existed. The same person now
// appears twice — once complete, once nearly empty — which is what makes the
// directory look broken.
//
// NOTHING IS MERGED AUTOMATICALLY. Stage 1 proposes, the manager decides in Excel,
// Stage 2 applies only what was approved.
//
//   node scripts/dedupe_customers.mjs                                    # dry run + workbooks
//   node scripts/dedupe_customers.mjs --apply <duplicates.csv> [<empty.csv>]
//   node scripts/dedupe_customers.mjs --restore <snapshot.json>
//
// --apply takes one or both workbooks: the duplicates file drives the merges, the empty
// file drives the retirements. Pass them together, or run it once per file.
//
// The FIRST apply should be a rehearsal: approve a single row whose 'משימות מקושרות'
// column is empty, apply it, check the numbers moved, then --restore the snapshot it
// prints and check they came back. Only then approve the rest.

import {
  fetchAll, patchRow, deleteRow, insertRows,
  stamp, writeCsv, writeSnapshot, loadSnapshot, readCsvFile,
} from './customerDb.mjs';
import { parseCSVRecords, phoneKey9, nameKey, importKeyOf, richness } from './customerMatch.mjs';

const argv = process.argv.slice(2);
/** Everything after a flag up to the next flag — --apply takes one or both workbooks. */
const flagArgs = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const out = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) out.push(argv[j]);
  return out;
};
const APPLY = flagArgs('--apply');
const RESTORE = (flagArgs('--restore') || [])[0];

const z = (v) => (v === null || v === undefined ? '' : String(v).trim());
const isRivhit = (c) => (c.import_key || '').startsWith('rivhit:');
const MERGE = 'מזג';
const MANUAL = 'בדיקה ידנית';

// Contact fields a survivor may inherit; deliberately excludes name, import_key,
// source, product, service_track, next_service_date, filter_replacement_month, notes.
const INHERIT = ['phone', 'address', 'city', 'email'];

// --- load ---------------------------------------------------------------------

async function load() {
  const [customers, ongoing, filters, malfunctions, installations] = await Promise.all([
    fetchAll('customers', '*'),
    fetchAll('ongoing_services', 'id,customer_id,customer_name', '&customer_id=not.is.null'),
    fetchAll('scheduled_filter_services', 'id,job_key,customer_id'),
    fetchAll('malfunctions', 'id,customer_name,phone'),
    fetchAll('installations', 'id,customer_name,phone'),
  ]);
  return { customers, ongoing, filters, malfunctions, installations };
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const uuidIn = (s) => (String(s || '').match(UUID) || [])[0] || null;

/**
 * Which customer ids a job actually points at. Note customer_arrival_confirmations
 * is absent on purpose: its job_key holds db-ongoing-* / db-inst-* / db-malf-* — job
 * ids, not customer ids — so it is unaffected by customer merges.
 */
function buildReferences({ ongoing, filters }) {
  const refs = new Map();
  const add = (id, what) => {
    if (!id) return;
    refs.set(id, (refs.get(id) || []).concat(what));
  };
  ongoing.forEach((r) => add(uuidIn(r.customer_id), 'שירות שוטף'));
  filters.forEach((r) => {
    add(uuidIn(r.customer_id), 'החלפת פילטר');
    add(uuidIn(r.job_key), 'החלפת פילטר');
  });
  return refs;
}

// --- stage 1: propose ---------------------------------------------------------

function propose(state) {
  const { customers } = state;
  const refs = buildReferences(state);

  // Richness is computed once, up front — a survivor picked partly for being
  // geocoded must not lose that signal when a later merge clears lat/lng.
  const rich = new Map(customers.map((c) => [c.id, richness(c)]));

  const groups = new Map();
  const push = (key, c) => {
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  };
  customers.forEach((c) => push(`p:${phoneKey9(c.phone)}`, c));
  customers.forEach((c) => push(`n:${nameKey(c.name)}`, c));

  const pairs = [];
  const seen = new Set();
  for (const [key, members] of groups) {
    if (key.endsWith('null') || members.length < 2) continue;
    const rivhits = members.filter(isRivhit);
    const existing = members.filter((c) => !isRivhit(c));
    if (!rivhits.length || !existing.length) continue;

    const survivor = existing
      .slice()
      .sort((a, b) => rich.get(b.id) - rich.get(a.id) || String(a.created_at).localeCompare(String(b.created_at)))[0];

    for (const dup of rivhits) {
      if (seen.has(dup.id)) continue;
      seen.add(dup.id);
      const matchedBy = key.startsWith('p:') ? 'טלפון' : 'שם';
      // A shared phone is often a household, not a duplicate — the Rivhit data
      // contains 'מאושר ורד והראל' and Outlook has 'נתי ולירז אמסטרדם'.
      const namesAgree = nameKey(dup.name) === nameKey(survivor.name);
      const suspect = matchedBy === 'טלפון' && !namesAgree;
      pairs.push({
        decision: suspect ? MANUAL : MERGE,
        survivor,
        dup,
        matchedBy,
        suspect,
        dupRefs: (refs.get(dup.id) || []).length,
      });
    }
  }

  const empties = customers.filter(
    (c) => isRivhit(c) && rich.get(c.id) === 0 && !seen.has(c.id) && !refs.has(c.id),
  );
  return { pairs, empties, refs, rich };
}

function writeWorkbooks({ pairs, empties }) {
  const ts = stamp();
  const dupPath = writeCsv(
    `review_duplicates_${ts}.csv`,
    // Every header is unique — the survivor and duplicate columns must never collide,
    // or a spreadsheet reader silently keeps only one of each pair.
    ['החלטה', 'שם (נשמר)', 'טלפון (נשמר)', 'כתובת (נשמר)', 'עיר (נשמר)',
      'שם (כפילות)', 'טלפון (כפילות)', 'כתובת (כפילות)', 'עיר (כפילות)',
      'איך הותאם', 'משימות מקושרות', 'מזהה נשמר', 'מזהה כפילות'],
    pairs.map((p) => [
      p.decision,
      p.survivor.name, z(p.survivor.phone), z(p.survivor.address), z(p.survivor.city),
      p.dup.name, z(p.dup.phone), z(p.dup.address), z(p.dup.city),
      p.matchedBy, p.dupRefs || '', p.survivor.id, p.dup.id,
    ]),
  );
  const emptyPath = writeCsv(
    `review_empty_${ts}.csv`,
    ['החלטה', 'שם', 'מספר לקוח ברווחית', 'מזהה'],
    empties.map((c) => ['מחק', c.name, (c.import_key || '').replace('rivhit:', ''), c.id]),
  );
  return { dupPath, emptyPath };
}

// --- the stranding hazard -----------------------------------------------------

/**
 * resolveCustomerCard (src/lib/customerCardMatch.ts:37-43) matches a job to a card by
 * customerImportKey FIRST, and customerImportKey (useCustomers.ts:69-71) does NOT sort
 * words — unlike the nameKey that grouped these duplicates. So a malfunctions /
 * installations row carrying the duplicate's spelling resolves to it today; delete the
 * row and resolution falls through to phone, and if that misses too it returns null.
 * The caller then upserts by name and RECREATES the customer we just deleted.
 *
 * Phone-matched merges are self-healing (survivor and duplicate share the phone key by
 * construction); only the name-matched set is exposed.
 */
function findStrandedJobs(pairs, state) {
  const jobs = [
    ...state.malfunctions.map((j) => ({ ...j, table: 'malfunctions' })),
    ...state.installations.map((j) => ({ ...j, table: 'installations' })),
  ];
  const out = [];
  for (const p of pairs) {
    const dupKey = importKeyOf(p.dup.name);
    const survKey = importKeyOf(p.survivor.name);
    if (dupKey === survKey) continue;
    for (const j of jobs) {
      if (importKeyOf(j.customer_name) !== dupKey) continue;
      const jp = phoneKey9(j.phone);
      if (jp && jp === phoneKey9(p.survivor.phone)) continue; // falls back to phone fine
      out.push({ table: j.table, id: j.id, from: j.customer_name, to: p.survivor.name });
    }
  }
  return out;
}

// --- stage 2: apply -----------------------------------------------------------

/**
 * Excel on a Hebrew Windows install writes cp1255 unless the user picks "CSV UTF-8"
 * explicitly. Read as utf8 that produces mojibake headers, every lookup returns
 * undefined, and the run reports "nothing approved" — a silent no-op that looks like a
 * decision. Refuse to guess: check the columns are really there and say what to fix.
 */
function readDecisions(path) {
  const rows = parseCSVRecords(readCsvFile(path));
  const head = rows.length ? Object.keys(rows[0]) : [];
  if (!head.includes('החלטה') || !(head.includes('מזהה כפילות') || head.includes('מזהה'))) {
    throw new Error(
      `${path} is not a readable decisions file — columns found: ${head.join(', ') || '(none)'}\n` +
      'If you edited it in Excel, re-save it as "CSV UTF-8 (Comma delimited)" and run again.',
    );
  }
  return rows;
}

async function apply(decisionPaths, state) {
  const { pairs, empties } = propose(state);
  const rows = decisionPaths.flatMap(readDecisions);

  // Key on the duplicate id, but keep the survivor the manager actually reviewed:
  // if anyone edits a customer in the app between the dry run and the apply, richness
  // can reorder and propose() may pick a different survivor than the one they signed off.
  const approved = new Map(
    rows.filter((r) => z(r['החלטה']) === MERGE)
      .map((r) => [z(r['מזהה כפילות']), z(r['מזהה נשמר'])]),
  );
  const approvedDeletes = new Set(
    rows.filter((r) => z(r['החלטה']) === 'מחק').map((r) => z(r['מזהה'])),
  );

  const merges = [];
  for (const p of pairs) {
    if (!approved.has(p.dup.id)) continue;
    const reviewed = approved.get(p.dup.id);
    if (reviewed && reviewed !== p.survivor.id) {
      console.warn(
        `skipping "${p.dup.name}" — the surviving card changed since you reviewed it ` +
        `(you approved ${reviewed}, the best match is now ${p.survivor.id}). Re-run the dry run.`,
      );
      continue;
    }
    merges.push(p);
  }
  const deletes = empties.filter((c) => approvedDeletes.has(c.id));
  if (!merges.length && !deletes.length) {
    console.log('Nothing approved in that file — no changes made.');
    return;
  }

  const stranded = findStrandedJobs(merges, state);
  const byId = new Map(state.customers.map((c) => [c.id, c]));

  // ---- snapshot BEFORE the first write ----
  const touchedIds = new Set(merges.flatMap((m) => [m.survivor.id, m.dup.id]));
  deletes.forEach((c) => touchedIds.add(c.id));
  const snapshot = {
    kind: 'dedupe',
    created_at: new Date().toISOString(),
    customers: [...touchedIds].map((id) => byId.get(id)).filter(Boolean),
    ongoing_services: state.ongoing.filter((r) => touchedIds.has(uuidIn(r.customer_id))),
    scheduled_filter_services: state.filters.filter(
      (r) => touchedIds.has(uuidIn(r.customer_id)) || touchedIds.has(uuidIn(r.job_key)),
    ),
    jobs: stranded.map((s) => ({ table: s.table, id: s.id, customer_name: s.from })),
  };
  const snapPath = writeSnapshot(`restore_dedupe_${stamp()}.json`, snapshot);
  console.log(`snapshot written -> ${snapPath}`);

  let filled = 0, repointed = 0, keysRewritten = 0, renamed = 0, deleted = 0;

  for (const m of merges) {
    // 1. fill the survivor's blanks from the duplicate — never overwrite
    const patch = {};
    for (const f of INHERIT) if (!z(m.survivor[f]) && z(m.dup[f])) patch[f] = z(m.dup[f]);
    if (patch.address || patch.city) {
      // mirrors shouldResetStoredCoords (src/hooks/useJobs.ts:61) so the app re-geocodes
      patch.lat = null; patch.lng = null; patch.place_id = null;
    }
    if (Object.keys(patch).length) {
      await patchRow('customers', m.survivor.id, { ...patch, source: 'app' });
      filled++;
    }

    // 2. repoint the two tables that reference a customer id
    for (const r of state.ongoing.filter((r) => uuidIn(r.customer_id) === m.dup.id)) {
      await patchRow('ongoing_services', r.id, {
        customer_id: String(r.customer_id).replace(m.dup.id, m.survivor.id),
      });
      repointed++;
    }
    for (const r of state.filters.filter(
      (r) => uuidIn(r.customer_id) === m.dup.id || uuidIn(r.job_key) === m.dup.id,
    )) {
      const body = {};
      if (uuidIn(r.customer_id) === m.dup.id) {
        body.customer_id = String(r.customer_id).replace(m.dup.id, m.survivor.id);
      }
      // 3. the uuid is embedded INSIDE job_key (filter-{year}-{month}-db-cust-{uuid});
      //    a string rewrite, not an FK update. Missing it orphans the scheduled job.
      if (uuidIn(r.job_key) === m.dup.id) {
        body.job_key = String(r.job_key).replace(m.dup.id, m.survivor.id);
        keysRewritten++;
      }
      await patchRow('scheduled_filter_services', r.id, body);
      repointed++;
    }
  }

  // 4. rewrite stranded job rows so they still resolve after the delete
  for (const s of stranded) {
    await patchRow(s.table, s.id, { customer_name: s.to });
    renamed++;
  }

  // 5. delete the duplicates and the approved empty rows
  for (const m of merges) { await deleteRow('customers', m.dup.id); deleted++; }
  for (const c of deletes) { await deleteRow('customers', c.id); deleted++; }

  console.log(
    `merged ${merges.length} | survivors filled ${filled} | references repointed ${repointed} ` +
    `(job_key rewrites ${keysRewritten}) | job rows renamed ${renamed} | rows deleted ${deleted}`,
  );
  console.log(`undo with:  node scripts/dedupe_customers.mjs --restore ${snapPath}`);
  console.log('(merges come from the duplicates workbook, retirements from the empty one —' +
    ' pass both to --apply, or run it once per file.)');
}

async function restore(path) {
  const snap = loadSnapshot(path);
  // Re-insert deleted customers with their ORIGINAL ids so embedded job_key uuids
  // stay valid, then put every changed row back as it was.
  await insertRows('customers', snap.customers);
  for (const c of snap.customers) {
    const { id, created_at, updated_at, ...rest } = c;
    await patchRow('customers', id, rest);
  }
  for (const r of snap.ongoing_services) await patchRow('ongoing_services', r.id, { customer_id: r.customer_id });
  for (const r of snap.scheduled_filter_services) {
    await patchRow('scheduled_filter_services', r.id, { job_key: r.job_key, customer_id: r.customer_id });
  }
  for (const j of snap.jobs || []) await patchRow(j.table, j.id, { customer_name: j.customer_name });
  console.log(`restored ${snap.customers.length} customers, ${snap.ongoing_services.length} ongoing, ` +
    `${snap.scheduled_filter_services.length} filter jobs, ${(snap.jobs || []).length} job rows`);
}

// --- main ---------------------------------------------------------------------

const state = await load();

if (RESTORE) {
  await restore(RESTORE);
} else if (APPLY) {
  if (!APPLY.length) {
    console.error('--apply needs at least one reviewed workbook: --apply <duplicates.csv> [<empty.csv>]');
    process.exit(1);
  }
  try {
    await apply(APPLY, state);
  } catch (err) {
    console.error(`
${err.message}`);
    process.exit(1);
  }
} else {
  const result = propose(state);
  const { pairs, empties } = result;
  const stranded = findStrandedJobs(pairs.filter((p) => p.decision === MERGE), state);
  const byPhone = pairs.filter((p) => p.matchedBy === 'טלפון').length;

  console.log(`customers ................. ${state.customers.length}`);
  console.log(`  rivhit-inserted ......... ${state.customers.filter(isRivhit).length}`);
  console.log(`duplicate candidates ...... ${pairs.length}  (phone ${byPhone}, name ${pairs.length - byPhone})`);
  console.log(`  proposed merge .......... ${pairs.filter((p) => p.decision === MERGE).length}`);
  console.log(`  flagged for manual check  ${pairs.filter((p) => p.suspect).length}  (shared phone, different names)`);
  console.log(`  duplicate has live jobs .. ${pairs.filter((p) => p.dupRefs).length}`);
  console.log(`empty rivhit rows ......... ${empties.length}  (no phone/address/city/email, no twin, no jobs)`);
  console.log(`job rows that would strand  ${stranded.length}  -> rewritten automatically on apply`);
  stranded.slice(0, 5).forEach((s) => console.log(`    ${s.table}: "${s.from}" -> "${s.to}"`));

  const { dupPath, emptyPath } = writeWorkbooks(result);
  console.log(`\nreview and set the החלטה column, then re-run with --apply:`);
  console.log(`  ${dupPath}`);
  console.log(`  ${emptyPath}`);
}
