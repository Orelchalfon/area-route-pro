// Turn the settlement snapshot (scripts/data/settlements.json, produced by
// scripts/fetch_settlements.mjs) into src/lib/generated/settlementAreas.ts: a
// name -> Area map (plus a best-effort SubArea) covering every Israeli settlement.
// No network access -- pure transform, safe to re-run offline.
//
// Run (from repo root):
//   node scripts/generate_settlement_areas.mjs
// or via the combined pipeline:
//   pnpm generate:areas
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const repo = join(__dir, '..');
const IN_PATH = join(repo, 'scripts/data/settlements.json');
const OUT_PATH = join(repo, 'src/lib/generated/settlementAreas.ts');

// --- keep in sync with src/lib/areas.ts normalizeCityName ---
// (Own copy on purpose: this script must run standalone at build time with no
// dependency on app source, and the normalization rules for raw CBS names differ
// slightly -- e.g. stripping "(מושב)" qualifiers that never appear in app data.)
function normalizeCityName(name) {
  let s = String(name ?? '');
  s = s.normalize('NFC');
  // Drop trailing/any parenthetical qualifiers, e.g. "נהלל (מושב)" -> "נהלל".
  s = s.replace(/[（(][^）)]*[）)]/g, ' ');
  // Unify maqaf/hyphen variants to a plain hyphen.
  s = s.replace(/־/g, '-');
  // Strip geresh/gershayim variants.
  s = s.replace(/[׳״'"`]/g, '');
  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Targeted spelling-variant expansion. A variant that happens to collide with a
// DIFFERENT settlement's area trips the duplicate-name guard below -- that's
// intentional, not a bug in this function.
function expandVariants(name) {
  const variants = new Set([name]);
  if (name.startsWith('קריית')) variants.add('קרית' + name.slice('קריית'.length));
  else if (name.startsWith('קרית')) variants.add('קריית' + name.slice('קרית'.length));
  if (name.includes('תקווה')) variants.add(name.replace(/תקווה/g, 'תקוה'));
  if (name.includes('תקוה')) variants.add(name.replace(/תקוה/g, 'תקווה'));
  return [...variants];
}

// --- מחוז (district) derivation: leading digit of סמל_נפה, per official CBS coding ---
// 1 ירושלים | 2 הצפון | 3 חיפה | 4 המרכז | 5 תל אביב | 6 הדרום | 7 יהודה ושומרון
const MACHOZ_TO_AREA = {
  '1': 'ירושלים',
  '2': 'צפון',
  '3': 'צפון',
  '4': 'מרכז',
  '5': 'מרכז',
  '6': 'דרום',
  '7': 'שומרון',
};

// --- SubArea (metadata only, best-effort, never fails the build) ---
// Most-specific wins: שם_מועצה (regional council) is tried first, then שם_נפה
// (sub-district). Keys are the bare values as they appear in the dataset (trimmed).
// נפה-level table intentionally omits 71-77 (יו"ש): those sub-areas are decided by
// regional council only (שומרון vs גוש עציון), never guessed from the נפה alone.
const NAPA_SUBAREA = {
  'ירושלים': 'הרי ירושלים',
  'צפת': 'גליל ועמקים',
  'כנרת': 'גליל ועמקים',
  'עפולה': 'גליל ועמקים', // נפת יזרעאל -- data.gov.il labels it by its seat city
  'נצרת': 'גליל ועמקים',
  'עכו': 'גליל ועמקים',
  'גולן': 'גליל ועמקים',
  'חיפה': 'חוף הכרמל וחדרה',
  'חדרה': 'חוף הכרמל וחדרה',
  'השרון': 'השרון',
  'פתח תקווה': 'שפלה ומרכז',
  'רמלה': 'שפלה ומרכז',
  'רחובות': 'שפלה ומרכז',
  'תל אביב': 'גוש דן',
  'רמת גן': 'גוש דן',
  'חולון': 'גוש דן',
  'אשקלון': 'נגב ודרום',
  'באר שבע': 'נגב ודרום',
};

const MOATZA_SUBAREA = {
  'לב השרון': 'השרון',
  'עמק חפר': 'השרון',
  'חוף השרון': 'השרון',
  'מטה יהודה': 'הרי ירושלים',
  'שומרון': 'שומרון',
  'מטה בנימין': 'שומרון',
  'הר חברון': 'גוש עציון',
  'גוש עציון': 'גוש עציון',
};

// --- Explicit, documented tie-breaks for ambiguous same-key collisions ---
// Two different settlements can normalize to the same key (e.g. a geresh-spelled
// name vs. a parenthetical-qualified name) and legitimately belong to different
// מחוז/Area. The duplicate-name guard below refuses to guess for those -- EXCEPT
// for the specific, reviewed cases in this table, keyed by the WINNING
// settlement's סמל_ישוב. This is a conscious business-geography decision made per
// name, not a general auto-resolution mechanism: any other same-key collision
// still trips the guard and fails the build (process.exit(1)).
const AMBIGUOUS_WINNER_CODES = {
  // 628 "ג'ת" (the Triangle Arab town Jat; near the company's northern service
  // belt) wins the normalized key "גת" over code 340 "גת (קיבוץ)" (a remote
  // southern kibbutz) -- normalizeCityName strips both the geresh in "ג'ת" and the
  // "(קיבוץ)" qualifier, so they collide on "גת". 628's נפה is חדרה, so its
  // SubArea resolves to 'חוף הכרמל וחדרה' via NAPA_SUBAREA. Result: "גת" -> צפון.
  '628': "ג'ת (628) over גת (קיבוץ) (340) for key \"גת\"",
  // 2730 "טייבה" (the large Triangle city; near the company's central service
  // area) wins the normalized key "טייבה" over code 497 "טייבה (בעמק)" (a small
  // Jezreel-valley village) -- normalizeCityName strips the "(בעמק)" qualifier so
  // they collide on "טייבה". 2730's נפה is השרון, so its SubArea resolves to
  // 'השרון' via NAPA_SUBAREA. Result: "טייבה" -> מרכז.
  '2730': 'טייבה (2730) over טייבה (בעמק) (497) for key "טייבה"',
};

function main() {
  const snapshot = JSON.parse(readFileSync(IN_PATH, 'utf8'));
  const records = snapshot.records;

  const nameToArea = new Map(); // normalized name -> Area
  const nameToSubArea = new Map(); // normalized name -> SubArea
  const nameToCode = new Map(); // normalized name -> סמל_ישוב of the record currently owning this key (winner-tracking, used by the override table below)
  const conflicts = []; // { name, existing, incoming, code }
  const unmappedArea = []; // { name, code, napa }
  const unmappedSubAreaCounts = new Map(); // "napa|moatza" -> count

  for (const record of records) {
    const rawName = record['שם_ישוב'];
    const name = normalizeCityName(rawName);
    if (!name) continue;

    const settlementCode = String(record['סמל_ישוב'] ?? '').trim();
    const napaCode = String(record['סמל_נפה'] ?? '').trim();
    const napaName = String(record['שם_נפה'] ?? '').trim();
    const moatzaName = String(record['שם_מועצה'] ?? '').trim();

    const machoz = napaCode.charAt(0);
    const area = MACHOZ_TO_AREA[machoz];
    if (!area) {
      unmappedArea.push({ name, code: settlementCode, napa: napaCode });
      continue;
    }

    const subArea = (moatzaName && MOATZA_SUBAREA[moatzaName]) || NAPA_SUBAREA[napaName] || undefined;
    if (!subArea) {
      const key = `${napaCode} ${napaName} | ${moatzaName || '(ללא מועצה)'}`;
      unmappedSubAreaCounts.set(key, (unmappedSubAreaCounts.get(key) || 0) + 1);
    }

    for (const variant of expandVariants(name)) {
      const existingArea = nameToArea.get(variant);

      if (existingArea === undefined) {
        nameToArea.set(variant, area);
        nameToCode.set(variant, settlementCode);
        if (subArea) nameToSubArea.set(variant, subArea);
        continue;
      }

      if (existingArea === area) {
        // Same key, same Area, different code -- not a conflict. First writer's
        // area stands; only backfill SubArea if nothing is recorded yet.
        if (subArea && !nameToSubArea.has(variant)) {
          nameToSubArea.set(variant, subArea);
        }
        continue;
      }

      // existingArea !== area -- genuine ambiguity. Consult the explicit override
      // table before falling back to the hard duplicate-name guard.
      const existingCode = nameToCode.get(variant);
      if (AMBIGUOUS_WINNER_CODES[settlementCode]) {
        // This record is the documented winner: replace the previously-stored
        // (losing) entry outright in BOTH SETTLEMENT_AREA and SETTLEMENT_SUB_AREA.
        nameToArea.set(variant, area);
        nameToCode.set(variant, settlementCode);
        if (subArea) nameToSubArea.set(variant, subArea);
        else nameToSubArea.delete(variant);
        console.log(`resolved ambiguous key "${variant}" -> code ${settlementCode} (${area}) [override]`);
      } else if (existingCode && AMBIGUOUS_WINNER_CODES[existingCode]) {
        // The already-stored entry is the documented winner: drop this (losing)
        // record for this key -- its Area/SubArea never enter either map.
        console.log(`resolved ambiguous key "${variant}" -> code ${existingCode} (${existingArea}) [override]`);
      } else {
        conflicts.push({ name: variant, existing: existingArea, incoming: area, code: settlementCode });
      }
    }
  }

  if (unmappedArea.length) {
    console.error(`${unmappedArea.length} settlement(s) had a סמל_נפה with no known מחוז mapping:`);
    for (const u of unmappedArea) console.error(`  ${u.name} (code ${u.code}, נפה ${u.napa})`);
    process.exit(1);
  }

  if (conflicts.length) {
    console.error(`${conflicts.length} name conflict(s) -- same normalized name resolves to different areas:`);
    for (const c of conflicts) {
      console.error(`  "${c.name}": existing=${c.existing} vs incoming=${c.incoming} (settlement code ${c.code})`);
    }
    console.error('Refusing to guess -- resolve manually (rename one side, or add a targeted override) and re-run.');
    process.exit(1);
  }

  // --- emit src/lib/generated/settlementAreas.ts ---
  const SUB_AREAS = [
    'גליל ועמקים',
    'חוף הכרמל וחדרה',
    'השרון',
    'שומרון',
    'גוש דן',
    'שפלה ומרכז',
    'הרי ירושלים',
    'גוש עציון',
    'נגב ודרום',
  ];

  const areaEntries = [...nameToArea.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'));
  const subAreaEntries = [...nameToSubArea.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'));

  const fmtEntries = (entries) =>
    entries.map(([key, value]) => `  '${key}': '${value}',`).join('\n');

  const output = `// GENERATED FILE — do not edit. Regenerate: pnpm generate:areas
import type { Area } from '@/lib/areas';

export const SUB_AREAS = [
${SUB_AREAS.map((s) => `  '${s}',`).join('\n')}
] as const;
export type SubArea = (typeof SUB_AREAS)[number];

export const SETTLEMENT_AREA: Record<string, Area> = {
${fmtEntries(areaEntries)}
};

export const SETTLEMENT_SUB_AREA: Record<string, SubArea> = {
${fmtEntries(subAreaEntries)}
};
`;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, output);

  // --- summary ---
  const byArea = new Map();
  for (const area of nameToArea.values()) byArea.set(area, (byArea.get(area) || 0) + 1);

  console.log(`Total settlement records: ${records.length}`);
  console.log(`Unique keys emitted (incl. spelling variants): ${nameToArea.size}`);
  console.log('Count by Area:');
  for (const [area, count] of [...byArea.entries()].sort()) console.log(`  ${area}: ${count}`);
  console.log(`With SubArea: ${nameToSubArea.size} | Without SubArea: ${nameToArea.size - nameToSubArea.size}`);
  if (unmappedSubAreaCounts.size) {
    console.log(`Unmapped SubArea groups (נפה | מועצה -> record count), ${unmappedSubAreaCounts.size} distinct:`);
    for (const [key, count] of [...unmappedSubAreaCounts.entries()].sort()) console.log(`  ${key} -> ${count}`);
  } else {
    console.log('Unmapped SubArea groups: none');
  }
  console.log(`Wrote ${OUT_PATH}`);
}

main();
