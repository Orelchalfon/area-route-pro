# Tal Hermon — Make.com Automation Blueprints

## What is included

1. `01_sheets_to_supabase_installations_BLUEPRINT.json`
   - Google Sheets `התקנות` → Supabase Edge Function `receive-from-make`
   - Reads up to 5000 rows
   - Uses range `A1:BZ1`
   - Handles: מרכז, ירושלים, ללא אזור, צפון, שומרון
   - Includes route filters that skip blank/whitespace/header customer-name cells before the HTTP request.

2. `02_sheets_to_supabase_malfunctions_BLUEPRINT.json`
   - Google Sheets `גיליון1` in the service/malfunctions workbook → Supabase Edge Function
   - Reads up to 5000 rows
   - Handles: מרכז, צפון, דרום, ירושלים, שומרון
   - Includes route filters that skip blank/whitespace/header customer-name cells before the HTTP request.

3. `03_app_to_sheets_update_WEBHOOK_SKELETON.json`
   - Skeleton for App/Supabase → Make → Google Sheets update.
   - After import, reconnect webhook and add exact Google Sheets Update Row modules.

4. `supabase_receive_from_make_index.ts`
   - Hardened Supabase Edge Function for Make → Supabase.
   - Validates `x-make-secret`.
   - Upserts by `sheet_row_id`.
   - Skips empty/header rows.
   - This logic is now mirrored by `supabase/functions/receive-from-make/index.ts`; keep the deployed function in sync with this hardened version.

5. `cleanup_empty_sheet_rows.sql`
   - One-time Supabase SQL helper for reviewing and deleting legacy installation rows imported from empty spreadsheet blocks.

## Import steps in Make.com

1. Make.com → Scenarios → Create a new scenario.
2. Click the three dots menu.
3. Choose `Import Blueprint`.
4. Import `01_sheets_to_supabase_installations_BLUEPRINT.json`.
5. Reconnect the Google Sheets module.
6. Replace the HTTP header:
   - `x-make-secret: REPLACE_WITH_MAKE_WEBHOOK_SECRET`
7. Run once manually.
8. Repeat the same for `02_sheets_to_supabase_malfunctions_BLUEPRINT.json`.
9. For app → Sheets updates, import `03_app_to_sheets_update_WEBHOOK_SKELETON.json`, connect the webhook, then add the exact Google Sheets search/update modules.

## Required Supabase secret

Set this in Supabase:

```bash
MAKE_WEBHOOK_SECRET=your-long-random-secret
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/your-app-to-sheets-webhook
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

Use `MAKE_WEBHOOK_SECRET` in Make HTTP headers. Use `MAKE_WEBHOOK_URL` in `send-to-make`.

## Required Supabase database setting

The DB trigger calls `send-to-make` via a configurable setting instead of a hard-coded project URL:

```sql
ALTER DATABASE postgres
SET app.send_to_make_url = 'https://<project-ref>.supabase.co/functions/v1/send-to-make';
```

Run this once per Supabase environment, then reconnect sessions if needed.

## Important

Make blueprints cannot safely preserve your private Google connection after export/import. After import, reconnect the Google Sheets modules manually.

## Built-in route filters

The imported scenario blueprints already include route filters so empty area blocks are not sent. Keep these filters on the route lines between the Router and each HTTP module.

Installations:
- מרכז: customer name column A / `0` is not empty
- ירושלים: column H / `7` is not empty
- ללא אזור: column O / `14` is not empty
- צפון: column V / `21` is not empty
- שומרון: column AC / `28` is not empty

Malfunctions:
- מרכז: column A / `0` is not empty
- צפון: column F / `5` is not empty
- דרום: column K / `10` is not empty
- ירושלים: column P / `15` is not empty
- שומרון: column U / `20` is not empty

Each filter trims whitespace and rejects blank, `שם`, `null`, and `undefined` values. The supplied Edge Function also skips empty/header rows server-side, so failed filtering will not poison the database.

## Existing empty installation rows

The 2026-05-21 installation export showed rows that are not technically empty because they contain defaults like `status`, `priority`, `source`, timestamps, and sometimes `region`, but they are empty as jobs because `customer_name`, `phone`, `city`, `address`, and `product_type` are blank.

Use `cleanup_empty_sheet_rows.sql` to preview those legacy rows first, then run the delete section only after confirming the preview contains no real installation records.

## Sync contract

- Rows from Make/Sheets are stored with `source='sheets'`.
- App-originated changes are stored with `source='app'`.
- `send-to-make` skips `source='sheets'` rows to prevent loops.
- App screens update live from Supabase Realtime after Make writes to Supabase; Google Sheets → Supabase freshness still depends on the Make scenario schedule.
