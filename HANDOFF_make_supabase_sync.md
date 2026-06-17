# Tal Hermon — Make.com ↔ Supabase Sync — Handoff Summary

**Date:** 2026-05-24
**Owner:** Orel
**Status:** In progress — root cause found, fix applied, verification pending

---

## 1. What this project is

`area-route` is Tal Hermon's field-service app (React + Vite + TS). Field data (installations,
malfunctions, ongoing services) lives in Google Sheets and needs to sync into Supabase so the app
can read/write it. Make.com is the integration layer between Sheets and Supabase.

- **Supabase project:** ref `pmiglnfoalieflbzxtfa`, URL `https://pmiglnfoalieflbzxtfa.supabase.co`
- **Tables:** `installations`, `malfunctions`, `ongoing_services` — all exist, all 5 migrations applied
- **Edge functions (all ACTIVE):**
  - `receive-from-make` (jwt off) — Sheets → Supabase direction
  - `send-to-make` (jwt off) — Supabase → Sheets direction (reverse)
  - `get-google-maps-key` (jwt on)
- **Make.com scenario in question:** `Tal Hermon | Sheets → Supabase | Installations`
  (scenario ID `5870354`, team ID `1775250`, URL: `eu1.make.com/1775250/scenarios/5870354/edit`)

## 2. Scenario architecture

```
Google Sheets (Search Rows) → Router (drop fully-empty rows)
                                  ├─ Route: מרכז (center)     → HTTP POST → receive-from-make
                                  ├─ Route: ירושלים (jerusalem) → HTTP POST → receive-from-make
                                  ├─ Route: ללא אזור (no-area)  → HTTP POST → receive-from-make
                                  ├─ Route: צפון (north)       → HTTP POST → receive-from-make
                                  └─ Route: שומרון (shomron)   → HTTP POST → receive-from-make
```

Each region is 7 columns wide in the sheet (name, date, city, address, phone, product, notes).
Customer-name column index per region: center=0 (A), jerusalem=7 (H), no-area=14 (O), north=21 (V),
shomron=28 (AC).

## 3. What was already fixed (before this session)

`current-blueprint.json` (repo root) was out of sync with the saved reference blueprints. It was
rewritten in place to fix:

1. **Wrong HTTP target** — was pointing at a stale/unrelated Supabase project
   (`cnbnhhcymmzisvwehyor.supabase.co`); corrected to `pmiglnfoalieflbzxtfa.supabase.co/functions/v1/receive-from-make`
2. **3 → 5 routes** — added the missing ללא אזור and שומרון routes
3. **Router-level filter** — drops fully-empty rows (OR-of-5 across the 5 customer-name columns)
   before they even reach the router
4. **Per-route filters** — each route also rejects rows where its own customer-name column is
   blank / equals header text "שם" / equals "null" / "undefined"
5. **`x-make-secret` header** — added to all 5 HTTP modules (this is now a real generated secret,
   not a placeholder — see §6)
6. **Sheets module limits** — row limit 100→5000, column range A1:ZZZ1→A1:BZ1
7. **Body templates** — upgraded to include `source: "make"`, a `sheet` metadata block
   (spreadsheet_id / sheet_name / row_number / region), and a region-scoped `sheet_row_id`
   (e.g. `installations:{{row}}:center`) for idempotent upserts
8. **Duplicate instance ID** — first import failed with `Invalid blueprint: Duplicate instance id
   '8' found`; fixed by renumbering. Final IDs: 1=Sheets, 8=Router, 2=Center, 7=Jerusalem,
   11=No-area, 9=North, 10=Shomron — all unique

## 4. Root cause found this session — sheet tab name mismatch

After re-importing the fixed blueprint, the scenario ran without errors but **0 rows were
reaching the HTTP modules** (Make execution log showed `operations: 1` on every successful run —
meaning only the Google Sheets module fired, nothing downstream).

**Diagnosis process:**
- Pulled the live scenario blueprint via the Make API (`scenarios_get`) and the execution history
  (`executions_list` / `executions_get-detail`)
- Confirmed the Supabase URL, the `x-make-secret` header, all 5 routes, and the column indices
  were all already correct in the live scenario
- Compared the live scenario's Google Sheets module config against the known-good reference
  blueprint (`tal_hermon_make_blueprints/01_..._BLUEPRINT.json`) and found one discrepancy:

  | | Reference (known-good) | Live scenario (broken) |
  |---|---|---|
  | Sheet tab name | `"התקנות"` (no trailing space) | `"התקנות "` (trailing space) |

- A user-uploaded CSV (Supabase export of the `installations` table) confirmed an **older**
  scenario had successfully imported real data in the past (May 20–21), proving the sheet itself
  has valid data — the live scenario just couldn't find it because of the sheet-name mismatch.

**Fix applied:** Orel renamed the Google Sheet tab to remove the trailing space (`"התקנות"`).

## 5. Current status — verification in progress

Next step in Make.com: re-select the sheet from the "Sheet Name" dropdown inside the Google
Sheets module (to clear the stale cached name with the trailing space), save, and run the
scenario again.

**Last known state:** Orel ran the scenario after the rename and reported seeing a bubble on the
Google Sheets module but **no bubbles on the HTTP modules** — meaning data is still not reaching
Supabase. This was not yet root-caused before the session ended. The Make.com MCP connector
(`mcp__d02dc133...`) was being used to pull execution details via `executions_list` when the tool
call failed with a permission/stream error — this needs to be retried.

## 6. Secrets / config status

- **`MAKE_WEBHOOK_SECRET`** — already set in the Make HTTP modules' `x-make-secret` header
  (value: `TGz3nAUbiCjMVsquTXlcYx03ejF2O47E4bMEB/pO8uGgwbbFVb7I31bLTb0ff4R2`). **Still needs
  confirmation that the same value is set in Supabase → Edge Functions → `receive-from-make` →
  Secrets.** If it's missing or mismatched there, expect 401s once rows do start flowing. The edge
  function check is conditional (only rejects if the env var is set AND the header doesn't
  match), so it's safe to set this any time without breaking the in-transition state.
- **`MAKE_WEBHOOK_URL`** (reverse direction, `send-to-make`) — not yet configured. Requires adding
  a webhook trigger module to scenario `03_app_to_sheets_update_WEBHOOK_SKELETON.json`, copying
  the URL Make issues, and pasting it into Supabase → Edge Functions → `send-to-make` → Secrets.
- **`GOOGLE_MAPS_API_KEY`** — assumed set for `get-google-maps-key`; not verified this session.
- **Google Sheets OAuth connection** — confirmed connected and active (`orelchalfon12@gmail.com`,
  connection ID `7659849`).

## 7. Open question — not yet resolved

Orel recalled GPT once suggesting "bulk-update instead of search row" for this pipeline, but
couldn't remember the exact context. Four possible interpretations, still unresolved:

- **(A)** Scenario 03 (App→Sheets direction): replace many single "Update Row" calls with one
  "Bulk Update Rows" — legitimate, saves Make operations.
- **(B)** Batch the Sheets→Supabase HTTP calls: aggregate rows into an array and send one POST
  instead of one-per-row. Saves up to 4999 ops/run but **requires a code change** to
  `receive-from-make/index.ts` (currently expects a single record, would need to accept an array).
- **(C)** Use "Get Range Values" instead of "Search Rows" for the read step, then iterate locally.
  Minor op savings, no functional difference otherwise.
- **(D)** Something else — Orel doesn't remember the exact wording.

No action taken on this yet. Needs Orel to check his Make.com / ChatGPT scrollback for the exact
phrasing, or just pick an interpretation and proceed.

## 8. Immediate next steps for whoever picks this up

1. In Make.com, open the Google Sheets module in scenario `5870354`, confirm the "Sheet Name"
   dropdown is actually pointing at the renamed `"התקנות"` tab (re-select it even if it looks
   right — Make can cache the old value).
2. Run the scenario once. Check the bubble count on **each** module, not just Google Sheets —
   click each HTTP module's bubble to see its actual request/response if it ran.
3. If Google Sheets bubble shows rows > 0 but HTTP bubbles still show 0 → the router/per-route
   filters are dropping everything. Click into the Router module and inspect which condition is
   failing (likely worth testing with `1.`0``-style numeric column access vs. header-name access —
   confirm Make's `google-sheets:filterRows` module returns numeric indices when
   `includesHeaders: true`, since that assumption hasn't been independently verified).
4. If rows now reach the HTTP modules, check the HTTP response status — 200 = success, 401 =
   `MAKE_WEBHOOK_SECRET` mismatch between Make and Supabase (see §6).
5. Confirm new rows appear in the Supabase `installations` table with `source = 'sheets'`.
6. Test a sheet row that's intentionally blank — it should be dropped before the router (verify
   it doesn't generate an HTTP call or increment Make operations).
7. Once installations sync is confirmed working, repeat verification for the `malfunctions`
   scenario (`02_..._BLUEPRINT.json`), which shares the same pattern.
8. Resolve the open bulk-update question (§7) and decide whether to implement option B (would
   require editing `supabase/functions/receive-from-make/index.ts` to accept an array payload).
9. Build out scenario 03 (`WEBHOOK_SKELETON.json`) — add the "Update Row" (or "Bulk Update Rows",
   pending §7) modules, add the webhook trigger, grab the `MAKE_WEBHOOK_URL`, and set it in
   Supabase secrets for `send-to-make`.

## 9. Files of interest

```
area-route/
├── current-blueprint.json                  ← optimized installations scenario, already imported
├── tal_hermon_make_blueprints/
│   ├── 01_..._installations_BLUEPRINT.json  ← reference (known-good), used for diffing
│   ├── 02_..._malfunctions_BLUEPRINT.json   ← reference (known-good), not yet verified live
│   ├── 03_..._WEBHOOK_SKELETON.json         ← App→Sheets skeleton, still needs Update Row modules
│   ├── README_IMPORT_STEPS.md
│   ├── cleanup_empty_sheet_rows.sql
│   └── supabase_receive_from_make_index.ts  ← hardened mirror of the live edge fn
└── supabase/functions/
    ├── receive-from-make/index.ts           ← validates x-make-secret on line 21
    ├── send-to-make/index.ts                ← POSTs to MAKE_WEBHOOK_URL
    └── get-google-maps-key/index.ts
```
