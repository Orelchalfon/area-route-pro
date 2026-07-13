# Agent prompts — PLAN_settlement_areas.xml

Two ways to run this. **Option A** (recommended): one prompt to the manager, it drives everyone.
**Option B**: run the pipeline yourself, one agent at a time, in order.

---

## Option A — single manager prompt (hands-off)

```
Use the manager agent.

Execute @plans/PLAN_settlement_areas.xml end to end. It is the spec — follow its
deliverables, constraints, and acceptance_criteria exactly; CLAUDE.md conventions
override defaults.

Orchestration requirements:
- Start with explorer: map the current state of src/lib/areas.ts (exports, CITY_AREA
  entries, consumers of getArea/AREA_ORDER/UNASSIGNED_AREA) and how useJobs consumes
  areas, so the implementer spec lists every preserved export by name.
- Split implementation into two implementer dispatches:
  (1) scripts/fetch_settlements.mjs + scripts/data/settlements.json snapshot +
      scripts/generate_settlement_areas.mjs + generated src/lib/generated/settlementAreas.ts
      + "generate:areas" script in package.json;
  (2) src/lib/areas.ts changes (normalizeCityName, resolution chain
      CITY_AREA → SETTLEMENT_AREA → UNASSIGNED_AREA, getSubArea) — only after (1) exists.
- Then tester: implement every <case> in the plan's areas.test.ts section, plus run
  the full suite.
- Then code-reviewer on the complete diff. Gate on: no changes to useJobs/dbJobSync,
  all pre-existing areas.ts exports intact, generation fails loudly on ambiguity,
  idempotent second run of pnpm generate:areas (zero git diff).
- Report acceptance_criteria one by one with pass/fail evidence.
```

---

## Option B — manual pipeline (run in this order)

### 1. explorer — recon before touching anything

```
Ask the explorer agent:

Read @plans/PLAN_settlement_areas.xml, then map the blast radius in this repo:
1. Every export of src/lib/areas.ts and every file importing any of them
   (getArea/CITY_AREA/AREAS/AREA_ORDER/UNASSIGNED_AREA/AreaOrUnassigned).
2. Where useJobs and components consume area values (grouping, section rendering,
   ordering) — file:line.
3. Current test coverage in src/lib/areas.test.ts — what exists, what the plan adds.
4. Anything in the codebase that already normalizes city names (would conflict with
   the planned normalizeCityName).
Output: concise list with file:line refs + any contradiction with the plan.
```

### 2. implementer — stage 1: data pipeline + generator

```
Have the implementer agent do stage 1 of @plans/PLAN_settlement_areas.xml:

Build ONLY the generation pipeline (do not touch src/lib/areas.ts yet):
- scripts/fetch_settlements.mjs per <file path="scripts/fetch_settlements.mjs">:
  Node ≥20 native fetch, paginated data.gov.il CKAN datastore download, schema
  validation on first page, fail-loud, pretty-printed stable-key-order output to
  scripts/data/settlements.json with fetched-at + source-URL metadata block.
- scripts/generate_settlement_areas.mjs per its <mapping>, <normalization> and
  <output> blocks: district→Area map, נפה/מועצה אזורית→SubArea map (most-specific
  wins, unmapped → omitted + logged), normalizeCityName rules (NFC, trim, collapse
  whitespace, strip geresh/gershayim variants, unify maqaf, drop parentheticals),
  spelling-variant duplicate keys, HARD FAIL on same name → different areas.
- Emit src/lib/generated/settlementAreas.ts exactly as specified (header comment,
  SETTLEMENT_AREA, SETTLEMENT_SUB_AREA, SUB_AREAS north→south, SubArea type,
  normalized sorted keys).
- Add "generate:areas" to package.json scripts.
Constraints: no new dependencies, pnpm only, strict TS output.
Verify: run pnpm generate:areas twice — second run must produce zero git diff.
Report: row counts, unmapped-district summary, generated file size (budget ≤80KB).
```

### 3. implementer — stage 2: runtime wiring

```
Have the implementer agent do stage 2 of @plans/PLAN_settlement_areas.xml:

Modify src/lib/areas.ts ONLY, per <file path="src/lib/areas.ts">:
1. Add + export normalizeCityName with rules identical to the generator (one
   canonical implementation; if shared module is non-trivial, duplicate with
   cross-referencing comments — a parity test comes in the next step).
2. Resolution order: normalize → CITY_AREA → SETTLEMENT_AREA → UNASSIGNED_AREA.
3. Add getSubArea(city): SubArea | undefined (no UI consumers yet).
4. PRESERVE every existing export name, the Area union, AREAS, AREA_ORDER,
   UNASSIGNED_AREA, and ALL existing CITY_AREA entries (deliberate overrides).
Forbidden: useJobs.ts, JobsProvider, dbJobSync.ts, any component files.
Verify: pnpm lint && pnpm test && pnpm build. Report any failure verbatim.
```

### 4. tester — coverage

```
Have the tester agent cover @plans/PLAN_settlement_areas.xml:

Extend src/lib/areas.test.ts with every <case> in the plan:
- Settlement types: חיפה→צפון, כפר תבור→צפון, ניר עם→דרום, אלון שבות per policy.
- Override precedence: מודיעין→'ירושלים' via CITY_AREA despite CBS מחוז המרכז.
- Normalization: 'פתח תקוה', ' פתח  תקווה ', geresh variants — all →'מרכז'.
- Parity: normalizeCityName output === generated map keys for 20 raw source names
  sampled from scripts/data/settlements.json.
- Unknown settlement → UNASSIGNED_AREA; getSubArea → undefined, never throws.
- Sub-areas: תל אביב→'גוש דן', רעננה→'השרון', רחובות→'שפלה ומרכז'.
Also add: SUB_AREAS has no duplicates; generated maps are non-empty (≥1,000 entries).
Run the FULL suite (pnpm test), not just this file. Production code is read-only for
you — if a test exposes a real bug, report it with reproduction, do not fix source.
```

### 5. code-reviewer — final gate

```
Run the code-reviewer agent on the current diff:

Context: @plans/PLAN_settlement_areas.xml was just implemented. Beyond your standard
checklist, verify plan-specific gates:
- Zero changes to useJobs.ts / JobsProvider / dbJobSync.ts (constraint <c>).
- src/lib/areas.ts: every pre-existing export still present with unchanged
  signatures; all original CITY_AREA entries intact.
- Generator: hard-fails (non-zero exit) on name→area ambiguity and unmapped
  districts; never guesses sub-areas.
- No runtime network calls or new runtime deps introduced; generated module within
  ~80KB budget.
- Snapshot committed with provenance metadata; generated file header present;
  pnpm generate:areas idempotent.
- Normalization parity between generator and runtime is enforced by a test.
Verdict: APPROVE or REQUEST CHANGES with ranked findings.
```

---

## Suggested manual QA after APPROVE (you, not an agent)

Run `pnpm dev`, open JobCategoryPage, confirm area sections render identically for
existing customers (acceptance_criteria: no normalization regressions), and spot-check
10 settlements across all five areas against real geography.
