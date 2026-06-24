# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Tal Hermon** (טל חרמון) — a Hebrew, fully RTL field-service management web app for a water-treatment company (filters, installations, malfunctions). Users: an admin who plans days and approves schedules, two field technicians (שילה, נריה) based in אבני חפץ, and customers who confirm appointment times via a public page. Work rules baked into scheduling logic: working days are Sunday–Thursday (no Friday/Saturday), hours 09:00–17:00, service areas around אבני חפץ.

## Commands

Use **pnpm** (repo ships `pnpm-lock.yaml`). Requires Node 20+ (`.nvmrc`).

- `pnpm dev` — Vite dev server on **http://localhost:8080**
- `pnpm build` — production build to `dist/` (`pnpm build:dev` for development mode)
- `pnpm lint` — ESLint across the repo
- `pnpm test` — Vitest once; `pnpm test:watch` for watch mode
- Run a single test file: `pnpm test src/lib/areas.test.ts`
- Run tests matching a name: `pnpm test -t "partial test name"`
- `pnpm preview` — serve the production build locally

## Architecture — the big picture

### Central job state: `useJobs` → `JobsProvider` → `useJobsContext`
The entire app's job/customer/scheduling state lives in a single hook, **`src/hooks/useJobs.ts`**, exposed app-wide through `JobsProvider` (`src/contexts/JobsContext.tsx`). Components read it via `useJobsContext()`, never by calling `useJobs` directly. `useJobs` **merges several data sources into one unified `jobs`/`customers` list**:

- `src/data/mockData.ts` — seed jobs/technicians (`initialJobs`, `technicians`)
- `useMalfunctionsInstallations` — real malfunctions/installations rows from Supabase
- `useCustomers` — base customer records from Supabase
- `useICSImport` — ongoing-service tasks parsed from an `.ics` calendar
- `useScheduledFilterServices` — persisted scheduling for synthetic filter jobs
- `loadCustomersFromCSV` — customer CSV import

`useJobs` is large and **hook-ordering-sensitive** — several commits exist solely to fix hook-order drift. Keep hooks unconditional and in stable order; do not add early returns above them.

### Job ID conventions encode the data source (critical)
A job's ID prefix determines how/where it persists. This is the contract the sync layer relies on:

- `db-malf-{uuid}` → a row in the Supabase `malfunctions` table
- `db-inst-{uuid}` → a row in the Supabase `installations` table
- `db-ongoing-{uuid}` → a row in the Supabase `ongoing_services` table created as a `שירות שוטף` request (it carries a `customer_id`; calendar-derived/follow-up `ongoing_services` rows have none and are NOT turned into jobs).
- `filter-{year}-{month}-{customerId}` → **synthetic** filter-replacement job (no DB row). Deterministic ID prevents duplicates. Scheduling persists to the `scheduled_filter_services` table keyed by `job_key` (= the synthetic ID).
- `db-*-cust-{id}` / `db-cust-{id}` → customer records derived from DB rows

`src/lib/dbJobSync.ts` (`getDbJobRef`, `buildDbJobUpdatePatch`, `buildMalfunctionInsert`/`buildInstallationInsert`/`buildOngoingServiceInsert`) maps an ID back to its table and builds the update/insert patch. When editing scheduling/persistence, respect these prefixes — `persistDbJob` no-ops for synthetic jobs, which instead go through `persistFilterServiceRow`.

**Creating a request ("פניה חדשה"):** `addJob` (`useJobs.ts`) INSERTs into the matching table (malfunction→`malfunctions`, installation→`installations`, filter_replacement→`ongoing_services`) with `status:'draft'` and **no technician/date by default**, so it lands in the "ממתינים לשיבוץ" pool (`JobCategoryPage`) and stays OFF the monthly board until the manager schedules it. Customers are persisted too: `addCustomer`/`updateCustomer` write through to the `customers` table (helpers `insertCustomer`/`updateCustomerRow`/`upsertCustomerByImportKey` in `useCustomers.ts`, idempotent on `import_key`). One-time CSV/ICS backfill: `scripts/backfill_customers.mjs`.

### Routing & access control (`src/App.tsx`)
Two-layer provider nesting: `AuthProvider` wraps everything; `JobsProvider` sits **inside** auth (only authenticated users load jobs). Public routes with no app shell: `/login` and `/confirm` (the customer confirmation page — does **not** touch the database). Everything else is behind `RequireAuth` + `AppLayout`; admin-only pages (`/malfunctions`, `/installations`, `/service`, `/work-schedule`, `/customers`, `/users`) are additionally wrapped in `RequireAdmin`. Heavy routes (maps, drag-drop, calendars, charts) are `lazy()`-loaded to keep the mobile bundle small — keep new heavy pages lazy.

### Source of truth: Supabase (Make.com is being retired)
**Supabase is the canonical store and the only backup.** Customers, malfunctions, installations, and
ongoing-service requests are created/edited in the app and persisted directly to Supabase (see the request
flow above and the customer write-through in `useCustomers.ts`/`useJobs.ts`). Seed customers can be loaded
from the bundled `public/contacts.csv` / `public/calendar_1.ics` via `scripts/backfill_customers.mjs`
(`--emit-csv` produces a table-shaped CSV for the Supabase dashboard importer; no service-role key needed).

**Legacy Make.com sync (do not extend):** historically, field data originated in Google Sheets and synced
into Supabase via **Make.com** scenarios and edge functions in `supabase/functions/` (`receive-from-make`,
`send-to-make`; `get-google-maps-key` is still used for the Maps key). Rows carry a `source` field
(`app` / `make` / `sheets`) and a `notify_make_on_change` trigger fires a webhook on non-`sheets` writes to
avoid loops. This pipeline is being decommissioned — treat the `source` field, the trigger, and the
make edge functions as vestigial. Keep setting `source: 'app'` on writes for now (harmless), but don't build
new behavior on the Make sync. `HANDOFF_make_supabase_sync.md` / `tal_hermon_make_blueprints/` are historical.

### Areas are derived from city, not from sheet columns
`src/lib/areas.ts` maps each city to an area (`CITY_AREA`) by real Israeli geography. The source sheets' hand-entered region columns are unreliable, so **never trust a row's region column — derive the area from the city name**. Add new cities to `CITY_AREA` as they appear.

### Maps
Google Maps **only** (`@react-google-maps/api`) — do not introduce Leaflet or Mapbox. The browser key is fetched at runtime from the `get-google-maps-key` edge function, never hard-coded. Geocoding utilities live in `src/lib/geocodeAddress.ts` / `customerCoords.ts`; address autocomplete in `src/components/AddressAutocomplete.tsx`.

## Conventions

- **Path alias `@/`** maps to `src/` — prefer it over deep relative imports.
- **Strict TypeScript.** Use the domain unions in `src/types/index.ts` (`JobType`, `JobStatus`, `ServiceTrack`, `CompletionStatus`, etc.) instead of repeated string literals.
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. Theme tokens live in `src/index.css` under `@theme inline`; prefer semantic utilities (`bg-primary`, `text-secondary`, `border-border`, `shadow-card`) over hard-coded values. Do not add Tailwind config files unless a tool requires it.
- **RTL is non-negotiable.** Use `text-start`/`text-end`/`ms-*`/`me-*`, never left/right-specific classes. All UI text is Hebrew; code identifiers are English.
- **Forms:** react-hook-form + zod. **Data fetching:** TanStack Query. **Toasts:** sonner.
- Tests use Vitest + jsdom + Testing Library (setup in `src/test/setup.ts`); colocate as `*.test.ts(x)` under `src/`. Focus tests on business rules, parsers (`src/lib/*Parser.ts`), and hooks.

## Auth & deploy notes

- Login is Supabase Auth (email/password) with **no public sign-up** — users are provisioned manually in the Supabase dashboard, and "Enable sign-ups" is turned off. Role-based access (admin/employee) is enforced via RLS (see `supabase/migrations/*_role_based_access.sql`, `*_restrict_rls_to_authenticated.sql`).
- `VITE_SUPABASE_*` values are public (they ship in the client bundle) — security is enforced by Supabase Auth + RLS, not by hiding them. Real secrets (`GOOGLE_MAPS_API_KEY`, `MAKE_WEBHOOK_SECRET`, `MAKE_WEBHOOK_URL`) are Supabase function secrets, never committed.
- Deploys to Netlify from the default branch (`netlify.toml` holds build config + SPA fallback redirect). Apply Supabase migrations and deploy edge functions before/at first deploy.

## Reference docs

- `CLAUDE_CODE_BRIEF.md` — full Hebrew product/data-model/business-logic spec (the canonical source for scheduling rules, service tracks, and the data model).
- `AGENTS.md` — contributor guide. `README.md` — setup/deploy. `HANDOFF_make_supabase_sync.md` — Make↔Supabase sync state.
