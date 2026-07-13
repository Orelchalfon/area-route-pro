// Fetch the CBS/data.gov.il settlement list ("citiesandsettelments" package) and
// snapshot it locally as scripts/data/settlements.json. Build-time only -- the app
// never calls data.gov.il at runtime; src/lib/generated/settlementAreas.ts (produced
// by scripts/generate_settlement_areas.mjs) is the artifact the app actually ships.
//
// No auth required (public CKAN API). Node >= 20 (native fetch).
//
// Run (from repo root):
//   node scripts/fetch_settlements.mjs
//
// Re-running is idempotent: if the newly-fetched records are byte-identical to what's
// already on disk, the existing metadata.fetched_at is preserved (no diff churn).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const repo = join(__dir, '..');
const OUT_PATH = join(repo, 'scripts/data/settlements.json');

const CKAN_BASE = 'https://data.gov.il/api/3/action';
const PACKAGE_ID = 'citiesandsettelments';

// Known-good resource id, probed manually ahead of this script existing (1310 records).
// Used only as a fallback if package_show discovery doesn't turn up a qualifying resource.
const FALLBACK_RESOURCE_ID = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';

const REQUIRED_FIELDS = ['שם_ישוב', 'סמל_ישוב', 'סמל_נפה', 'שם_נפה', 'שם_מועצה'];
const PROJECT_FIELDS = ['סמל_ישוב', 'שם_ישוב', 'סמל_נפה', 'שם_נפה', 'סמל_מועצה_איזורית', 'שם_מועצה', 'לשכה'];

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.json();
  if (!body.success) throw new Error(`CKAN API error for ${url}: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

function hasAllRequiredFields(fields) {
  const ids = new Set((fields || []).map((f) => f.id));
  return REQUIRED_FIELDS.every((f) => ids.has(f));
}

async function discoverResourceId() {
  let pkg;
  try {
    pkg = await getJSON(`${CKAN_BASE}/package_show?id=${encodeURIComponent(PACKAGE_ID)}`);
  } catch (err) {
    console.error(`Failed to fetch package_show for "${PACKAGE_ID}": ${err.message}`);
    console.error(`Falling back to known resource_id ${FALLBACK_RESOURCE_ID}`);
    return FALLBACK_RESOURCE_ID;
  }

  const candidates = (pkg.resources || []).filter((r) => r.datastore_active);
  let best = null;
  for (const candidate of candidates) {
    let probe;
    try {
      probe = await getJSON(`${CKAN_BASE}/datastore_search?resource_id=${encodeURIComponent(candidate.id)}&limit=1`);
    } catch {
      continue;
    }
    if (!hasAllRequiredFields(probe.fields)) continue;
    if (!best || probe.total > best.total) best = { id: candidate.id, total: probe.total };
  }

  if (best) return best.id;

  console.error(`No datastore_active resource on package "${PACKAGE_ID}" has all required fields (${REQUIRED_FIELDS.join(', ')}).`);
  console.error(`Falling back to known resource_id ${FALLBACK_RESOURCE_ID}`);
  return FALLBACK_RESOURCE_ID;
}

async function fetchAllRecords(resourceId) {
  const searchUrlBase = `${CKAN_BASE}/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=1000`;

  const page1 = await getJSON(`${searchUrlBase}&offset=0`);
  const presentIds = new Set((page1.fields || []).map((f) => f.id));
  const missing = REQUIRED_FIELDS.filter((f) => !presentIds.has(f));
  if (missing.length) {
    console.error(`Resource ${resourceId} is missing required field(s): ${missing.join(', ')}`);
    console.error(`Fields present: ${[...presentIds].join(', ')}`);
    process.exit(1);
  }

  const total = page1.total;
  const collected = [...page1.records];
  let offset = collected.length;

  while (collected.length < total) {
    const page = await getJSON(`${searchUrlBase}&offset=${offset}`);
    if (!page.records.length) break; // safety valve against an infinite loop
    collected.push(...page.records);
    offset += page.records.length;
  }

  if (collected.length !== total) {
    console.error(`Record count mismatch: collected ${collected.length}, expected ${total} (resource ${resourceId}).`);
    process.exit(1);
  }

  return { records: collected, total, searchUrlBase };
}

function projectRecord(record) {
  const projected = {};
  for (const field of PROJECT_FIELDS) projected[field] = record[field] ?? null;
  return projected;
}

function recordsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const resourceId = await discoverResourceId();
  console.log(`Using resource_id: ${resourceId}`);

  const { records: raw, total, searchUrlBase } = await fetchAllRecords(resourceId);
  console.log(`Fetched ${raw.length} / ${total} records.`);

  const projected = raw
    .map(projectRecord)
    .sort((a, b) => Number(a['סמל_ישוב']) - Number(b['סמל_ישוב']));

  let fetchedAt = new Date().toISOString();
  if (existsSync(OUT_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
      if (recordsEqual(existing.records, projected)) {
        fetchedAt = existing.metadata?.fetched_at || fetchedAt;
        console.log('Records unchanged from previous fetch -- preserving fetched_at.');
      }
    } catch {
      // Existing file unreadable/malformed -- treat as no previous snapshot.
    }
  }

  const out = {
    metadata: {
      source_url: searchUrlBase,
      resource_id: resourceId,
      record_count: projected.length,
      fetched_at: fetchedAt,
    },
    records: projected,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${projected.length} records -> ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
