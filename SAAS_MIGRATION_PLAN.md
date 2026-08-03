# Tal Hermon → Multi-Tenant SaaS: Migration Plan

## Context

**Tal Hermon** is today a single-tenant Hebrew/RTL field-service app serving exactly one water-treatment company: one admin, two technicians (`שילה`, `נריה`), one Supabase project, one hardcoded set of business rules. The goal is to turn it into a multi-tenant SaaS that any field-service business with technicians can subscribe to — scheduling, malfunctions, installations, recurring maintenance, customer management.

**Confirmed product decisions (settled — do not re-litigate):**

1. **Market:** Israel-first, Hebrew-only UI. Build the i18n/locale *seams* now (tenant timezone, locale, phone country, geography provider) so English/LTR is a later drop-in, not a rewrite. The ~486 Hebrew string literals are **not** extracted in this program of work.
2. **Onboarding:** Sales-led. Model orgs/plans/seats/subscription-status correctly in the schema now, provision manually via a super-admin console. No Stripe, no public signup — only the seam for them.
3. **Domain model:** Replace the fixed job tables with **one polymorphic `jobs` table + a per-org `job_types` registry** (label, color, default duration, default priority, recurrence rule).
4. **Milestone 1 = tenant isolation and safety.** Nothing customer-facing ships until `org_id` + RLS + versioned migrations are real.

**Intended outcome:** a second paying business can be onboarded onto the same deployment with provably zero data visibility across tenants, with the schema under version control and a rehearsed rollback for every migration.

---

## The finding that reorders everything

> **`supabase/` does not exist in the working tree and is not tracked by git.**

Verified: `ls supabase` → no such directory. `.gitignore:57` is a global `*.sql` ignore. The folder was deleted across five commits with the message *"Remove supabase/ folder: exposes project ID."*

Consequences:

- **Zero migration history exists locally.** The live Supabase project is the only source of truth for DDL and RLS.
- **Live server code has no source anywhere.** `admin-create-user` (holds a service-role key, creates users) and `get-google-maps-key` are invoked by `src/hooks/useAdminUsers.ts` and `src/hooks/useGoogleMapsKey.ts` but exist only in the Supabase dashboard.
- **Two tests are already red** because they reference missing files: `src/lib/customerRlsMigration.test.ts` and `src/lib/sync.test.ts`.
- **`src/integrations/supabase/types.ts` is stale** — `push_subscriptions` is missing from it, which is why `src/hooks/usePushNotifications.ts:6-9` casts to an untyped client.
- At least two live triggers exist only as code comments: `enforce_employee_job_update` (`src/lib/dbJobSync.ts:135-139`) and `notify_make_on_change` (`CLAUDE.md:61`).

**The stated rationale for the deletion is invalid.** The project ref is *currently committed* in `CLAUDE_CODE_BRIEF.md` and `HANDOFF_make_supabase_sync.md`, is in git history, and ships in the deployed JS bundle alongside the publishable anon key. A project ref is a public identifier, like a subdomain — every browser request contains it. Security here is RLS + key scoping, not obscurity. The genuinely sensitive files are `supabase/config.toml` and `supabase/.env.local`, and `.gitignore:62-63` already covers both by name.

**You cannot migrate what isn't versioned.** Phase 0 is non-negotiable and blocks everything.

---

## Current-state facts driving the design

| Area | Current state |
|---|---|
| **Tenancy** | No `org_id`/`tenant_id` on any of the 8 tables. No foreign keys at all (`Relationships: []` throughout `types.ts`). |
| **Data access** | Exactly **35 `.from()` call sites in 9 files**, all inside `src/hooks/` + `src/contexts/AuthContext.tsx`. Zero in components/pages. Queries have no filters beyond status/archived. |
| **Technicians** | A client-side 2-element array in `src/data/technicians.ts` with string ids `'t1'`/`'t2'`. Those literals are stored in `technician_id` columns across 5 tables **and** `profiles.technician_id`. Imported by 14 UI files, several doing `technicians[0].id` or `.slice(0,2)`. |
| **Dirty ids** | `ongoing_services.customer_id` and `scheduled_filter_services.customer_id` store the prefixed app id `db-cust-{uuid}` as text. A live RLS policy literally does `replace(os.customer_id,'db-cust-','') = customers.id::text`. |
| **Auth** | Role comes from a client-side `profiles` lookup (`AuthContext.tsx:76-82`), not JWT claims. On error it **fails open** to employee access (`:83-87`). The `onAuthStateChange` callback must stay synchronous or supabase-js deadlocks (`:35-40`). |
| **Realtime** | 4 hooks use hardcoded global channel names (`customers-realtime`, `malf-inst-realtime`, …). One hook, `useOngoingServices.ts:240`, already uses a randomized name — someone hit the collision once and patched a single site. |
| **Uniques** | `customers.import_key`, `scheduled_filter_services.job_key`, `approved_schedule_days(technician_id, service_date)` are all **globally** unique. |
| **Business rules** | Sun–Thu weekend rule duplicated inline in 5 files. Day start `10:00` in two copies. `perDay = 3` bin-packing with a stale comment saying 15. No end-of-day cap exists at all despite docs claiming 09:00–17:00. |
| **Recurrence** | Four competing mechanisms: `filterReplacementMonth` anniversary month, `ServiceTrack.intervalMonths` (generates nothing), synthetic in-memory `filter-{y}-{m}-{cust}` jobs, and the `scheduled_filter_services` table. |
| **Tests** | 14 test files, all pure-logic. Zero component-render tests, zero route/guard tests. No safety net for a shell refactor. |

---

## Five architectural decisions

### 1. RLS via JWT custom claims, **not** a memberships subquery — with one deliberate exception

Register a Postgres **Custom Access Token Hook** that injects `org_id`, `org_role`, `technician_id` into `app_metadata` at token-issue time. Then:

```sql
-- STABLE, touches no table
create function public.auth_org_id() returns uuid
  language sql stable as $$ select nullif(auth.jwt()->'app_metadata'->>'org_id','')::uuid $$;

-- read policy shape
using (org_id = (select public.auth_org_id()))
```

The `(select ...)` wrapper is not cosmetic — it forces Postgres to evaluate the function **once as an InitPlan** rather than per candidate row.

**Why not a `current_org_id()` that queries `memberships`?** Because the existing `is_admin()` / `current_technician_id()` are exactly that pattern and they are already on the hot path for every query. Scaling a memberships subquery to multi-tenant means a lookup per row of every table — the canonical Supabase performance footgun. It is invisible at 1 tenant and fatal at 20.

**Why this fits `AuthContext` specifically:** `AuthContext.tsx:35-40` documents that the auth callback must stay synchronous. With claims in the JWT, `org_id`/`role`/`technician_id` are readable **synchronously** from `session.user.app_metadata` inside that callback — the async profile-fetch effect at `:59-98` gets deleted entirely. That effect is also the fail-open bug (`:83-87` → `role = null` → employee access). One edit removes a deadlock hazard, an authorization bug, and a per-login round trip.

**The exception — where a table lookup is still correct.** JWTs live up to an hour, so a revoked membership or suspended subscription stays valid until refresh. Put the authoritative check on the **write** path only, where per-row cost is irrelevant:

```sql
with check (
  org_id = (select public.auth_org_id())
  and (select public.membership_is_writable())  -- memberships.status='active' and org not suspended
)
```

Reads are millions of rows and hot; writes are single-row and rare. Split the guarantee accordingly.

**Belt and braces:** a `before insert` trigger `set_org_id()` that unconditionally sets `NEW.org_id := auth_org_id()`. The client never sends `org_id`, so the repository layer cannot get it wrong and a compromised client cannot forge it.

**Index rule, non-negotiable:** `org_id` must be the **leading column** of every index on every tenant table — `jobs(org_id, scheduled_date)`, `jobs(org_id, technician_id, scheduled_date)`, `customers(org_id, city)`. An RLS predicate on an unindexed leading column is a sequential scan wearing a policy costume.

**Multi-org users:** the hook writes the user's *active* org. Don't build an org-switcher UI in M1 — but the schema must allow one user → N memberships from day one, or that becomes a data migration later.

### 2. Run old and new job schema in parallel behind the repository layer

With one live paying customer, a big-bang cutover has unbounded blast radius and no rehearsal. The repository layer makes the switch an env-var flip plus a reverse-sync script. Detailed in Phase 4.

### 3. Repository layer at `src/data/repositories/*`, with the raw client renamed so misuse is loud

```
src/data/db.ts                      // exports `supabaseUnsafe` — the ONLY module importing @supabase/supabase-js
src/data/OrgScope.ts                // { orgId, role, technicianId, settings } from JWT claims
src/data/realtime.ts                // org-scoped channel factory
src/data/repositories/{customers,jobs,jobTypes,technicians,approvedDays,orgSettings,pushSubscriptions}.ts
```

Every repository function takes `scope: OrgScope` as its **first explicit parameter** — not read from a context — so the dependency is visible in the type signature and testable without a React tree.

Even though RLS makes it redundant on reads, the repository **also** adds `.eq('org_id', scope.orgId)`. Defense in depth: if a policy is ever mis-authored or `FORCE ROW LEVEL SECURITY` is dropped during a migration, the client filter still holds. It costs nothing and makes intent legible.

**Enforcement — three layers:**

1. `no-restricted-imports` in `eslint.config.js`: importing `@/data/db` is an error outside `src/data/**`. Renaming the export from `supabase` → `supabaseUnsafe` breaks all 35 sites at compile time — that *is* the migration checklist.
2. `no-restricted-syntax` on `MemberExpression[object.name=/supabase/i]` + `.from`/`.rpc`/`.channel`, scoped to `src/{hooks,components,pages,contexts}/**`. Scope it to the supabase object specifically — a naïve `callee.property.name='from'` selector false-positives on the ~15 `Array.from` calls in `MonthlyScheduleBoard.tsx`, `WorkSchedulePage.tsx`, and others.
3. `src/data/architecture.test.ts` globbing the tree and asserting zero matches outside `src/data/**`. ESLint rules get disabled with inline comments; a failing CI test does not.

**Do not build a typed wrapper client** that proxies `.from()`. It looks elegant and it leaks — someone will need `.rpc()` or a `!inner` join and will punch through it. Named repository functions with hand-written signatures are more code and strictly better boundaries.

### 4. `job_types` is a registry with a **stable key**

`job_types.key` is a slug (`filter_replacement`, `malfunction`, `installation`) that code branches on where behavior genuinely differs. `label`/`color`/`default_duration_min` are org-editable presentation. Without a stable key you end up string-matching Hebrew labels, which is how these registries rot. Seeding Tal Hermon's three types with the exact keys already in `src/types/index.ts:1` means `JOB_TYPE_CONFIG` becomes a *fallback* for known keys rather than a rewrite.

### 5. i18n: build the seams, explicitly defer the extraction

Phase 3 installs `OrgConfigProvider`, `useFormat()` (locale + tz from `org_settings`, replacing the `he-IL`/`Asia/Jerusalem` literals at `src/lib/dates.ts:13,21`), a `t()` with a `he` dictionary, `<html lang dir>` from settings, and a warn-level ESLint ratchet banning *new* physical-direction classes (`ml-`, `border-l`, `text-right`) in favour of logical (`ms-`, `border-s`, `text-start`). The 486-string extraction happens when a non-Hebrew customer is actually on the table, and it's mechanical by then.

---

## Target schema

### Tenancy core

**`plans`** — `id text PK` (`starter`/`pro`/`enterprise`), `name`, `max_seats`, `max_technicians`, `features jsonb`, `is_public`, `sort_order`. Seeded rows, no UI.

**`orgs`** — `id uuid PK`, `slug citext UNIQUE`, `name`, `legal_name`, `status org_status` (`trialing|active|suspended|cancelled`), `created_at`, `created_by`, `deleted_at` (soft delete — never hard-delete a tenant).

**`org_subscriptions`** — `org_id`, `plan_id`, `status`, `seats`, `current_period_start/end`, `trial_ends_at`, **`billing_provider text NULL`, `billing_ref text NULL`** ← the Stripe seam, null until wired. Separate table so plan changes keep history. `orgs.status` is a trigger-maintained denormalized cache so RLS can check it without a join.

**`memberships`** — `org_id`, `user_id → auth.users`, `role org_role` (`owner|admin|dispatcher|technician`), `technician_id → technicians NULL`, `status` (`invited|active|revoked`), `is_default`, `invited_by`. `UNIQUE(org_id, user_id)`. Note `org_role` is a superset of the existing `app_role` — create a new enum rather than `ALTER TYPE`, since the old one is baked into `profiles.role` and `is_admin()`.

**`platform_admins`** — `user_id uuid PK`, `granted_at`, `granted_by`. Deliberately **not** a membership role: an org owner must have no path to platform admin, and a role enum value is one bad UPDATE policy away from privilege escalation.

**`org_settings`** — `org_id uuid PK`. Every hardcoded business rule lands here:

| Column | Replaces |
|---|---|
| `timezone`, `locale`, `direction` | `src/lib/dates.ts:13,21` literals; `index.html:2` `lang="en"` |
| `country`, `phone_country` | `src/lib/whatsapp.ts` (+972) |
| `working_days int[]` | the `dow!==5 && dow!==6` in 5 files |
| `day_start_time`, `day_end_time` | `monthly-schedule/utils.ts:73`, `DailyRoutePage.tsx:111`, the `'08:00'` defaults |
| `soft_jobs_per_day`, `hard_jobs_per_day` | `utils.ts:44` (`perDay=3`), `MonthlyScheduleBoard.tsx:532` (`<15`) |
| `home_base_lat/lng/label` | `src/lib/customerCoords.ts` (אבני חפץ) |
| `geography_source` (`il_cbs`) | `src/lib/areas.ts`, `src/lib/generated/settlementAreas.ts` |
| `maps_region`, `maps_language` | `src/lib/googleMapsConfig.ts` |
| `branding jsonb` (`app_name`, `logo_url`, `primary_hsl`, `accent_hsl`) | `AppLayout.tsx:134`, `logo.png`, `index.html` theme-color |

The two `jobs_per_day` values stay **separate** because `utils.ts:44` (bin-packing target = 3) and `MonthlyScheduleBoard.tsx:532` (overflow warning = 15) are genuinely different numbers with a stale comment claiming otherwise. Do not unify them and silently change behavior for the live customer.

**`job_types`** — `org_id`, `key`, `label`, `color_token`, `default_duration_min`, `default_priority`, `is_recurring`, `recurrence_kind` (`none|anniversary_month|interval_months`), `recurrence_interval_months`, `sort_order`, `active`. `UNIQUE(org_id, key)`.

`recurrence_kind` is the unification point for the competing models: `anniversary_month` = today's `filterReplacementMonth`; `interval_months` = today's `ServiceTrack.intervalMonths` (which currently feeds `recalcNextServiceDate` at `useJobs.ts:1201-1217` and generates nothing).

**`technicians`** — `id uuid`, `org_id`, `user_id NULL` (a technician may exist before/without a login), `display_name`, `phone`, `color_token`, `skills text[]`, `home_area`, `active`, `sort_order`, **`legacy_code text`** (`t1`/`t2`), `UNIQUE(org_id, legacy_code)`. `legacy_code` is the entire migration strategy for the `t1`/`t2` problem; dropped in Phase 7.

### Domain

**`customers`** — add `org_id`; `import_key` unique becomes `UNIQUE(org_id, import_key)`.

**`jobs`** — `id uuid`, `org_id`, `job_type_id`, `customer_id uuid NULL`, `technician_id → technicians NULL`, `status`, `priority`, `scheduled_date`, `scheduled_time`, `estimated_duration_min`, `route_order int` (the manual drag order, currently implicit), `title`, `address`, `city`, `area`, `lat`, `lng`, `phone`, `notes`, `completion_status`, `completion_notes`, `completed_at`, `recurrence_parent_id`, **`occurrence_key text NULL`**, **`legacy_table`, `legacy_id`, `legacy_customer_ref`**, timestamps.

- `occurrence_key` replaces both the synthetic `filter-{y}-{m}-{cust}` id and `scheduled_filter_services.job_key`. `UNIQUE(org_id, occurrence_key) WHERE occurrence_key IS NOT NULL` gives the same duplicate-prevention guarantee the deterministic string id provides today — but enforced by the database instead of by two hand-written, **already-divergent** code paths.
- `legacy_*` columns are the rollback lifeline: every backfilled row knows exactly which old row it came from, which also makes the reverse-sync script trivial.
- **Every job becomes a real row.** Synthetic jobs disappear as a concept, killing `generateFilterJobs`, the `filter-` prefix, `isFilterJob`, `persistFilterServiceRow`, and both roll-forward copies (`useJobs.ts:753-783` and `:855-892`) — including the latent bug at `:874` where the second copy hand-builds the id string instead of calling `makeFilterJobId` (`src/lib/idConventions.ts:38`). Identical output today, so dormant; fires the moment the format changes.

**`job_events`** — `org_id`, `job_id`, `actor_user_id`, `action`, `details jsonb`, `created_at`. Turns `useActivityLogs.ts` (currently pure client `useState` — logs die on refresh) into real audit data. Required once multiple users touch the same schedule.

**`approved_schedule_days`** — add `org_id`; `technician_id` → uuid FK; `UNIQUE(org_id, technician_id, service_date)`.

**`push_subscriptions`** — add `org_id`. Keep `UNIQUE(endpoint)` **global**, not composite — the endpoint is browser-generated and genuinely globally unique; a composite would let one device register twice and receive doubled pushes.

**`profiles`** — deprecate. Its two useful columns move to `memberships`, where they belong once a user can be in more than one org. Keep the table until Phase 7 so existing `is_admin()` doesn't break mid-flight.

### Functions

`auth_org_id()`, `auth_org_role()`, `auth_technician_id()`, `is_org_admin()` — all `STABLE`, JWT-only, zero table access. `is_platform_admin()` — reads `platform_admins` (~1 row, super-admin policies only). `custom_access_token_hook(event jsonb)` — the claim injector. `set_org_id()` — insert trigger. Keep `is_admin()`/`current_technician_id()` as **thin shims** delegating to the new functions until Phase 7, so un-rewritten policies keep working.

---

## Phases

### Phase 0 — Repatriate the schema · 1 week · **blocks everything**

1. **Fix `.gitignore`.** Delete line 57 (`*.sql`) and line 58 (the single-file negation). Replace with targeted ignores: `supabase/config.toml`, `supabase/.env*`, `scripts/import/**/*.sql`. Record the rationale in the commit message.
2. **`supabase db pull`** → `supabase/migrations/<ts>_baseline.sql`. Read it line by line; this is the first accurate view of the live schema in months.
3. **`supabase functions download`** for `admin-create-user`, `get-google-maps-key`, and whatever else the dashboard lists. `admin-create-user` holds a service-role key and creates users — the most security-critical code you own, currently existing in exactly one place with no backup.
4. **Regenerate `src/integrations/supabase/types.ts`**; delete the untyped cast at `usePushNotifications.ts:6-9`.
5. **Restore the two red tests** from the pulled baseline (`customerRlsMigration.test.ts`'s policy text will be verbatim in `pg_policies`).
6. **Shadow DB + CI:** GitHub Action running `supabase db reset` against throwaway Postgres on every PR, then `pnpm test`. This is the gate that makes every later phase safe.
7. **Backup discipline:** confirm **PITR is enabled** (paid-tier feature — if you're on free, this phase does not pass). Add `scripts/db_snapshot.mjs` doing a `pg_dump`, run before every migration from here on.

**Exit gate:** `supabase db diff` against prod returns empty. All 14 tests green. Edge function source committed. A `pg_dump` snapshot exists.

---

### Phase 1 — Repository layer, zero schema change · 1.5–2 weeks

Pure refactor; prod schema untouched, so this ships continuously at near-zero risk.

1. Create `src/data/db.ts`, rename the export to `supabaseUnsafe`. All 35 `.from()` sites + 2 `functions.invoke()` sites break at compile time — that's the worklist.
2. Move each `.from()` into a named repository function, **ordered by file size ascending** to build confidence: `useScheduledFilterServices` (1) → `usePushNotifications` (1) → `useMalfunctionsInstallations` (2) → `useOngoingServices` (3) → `useApprovedDays` (4) → `useCustomers` (5) → `useCustomerDirectory` (6) → `useJobs` (12) → `AuthContext` (1).
3. `src/data/realtime.ts`: `subscribeToTable(scope, table, handler)` generating channel names as `${table}:${orgId}:${uuid}`. Fixes both cross-tenant crosstalk and the hardcoded-global collision, and normalizes the one-off random name at `useOngoingServices.ts:240`.
4. `OrgScope` ships as a **stub** returning a hardcoded Tal Hermon org id. The signature is real; the value is fake. This is the seam.
5. Wire the three enforcement layers.
6. Add repository unit tests with a mocked client — the first non-pure-logic coverage, and the only safety net that survives Phase 4.

**Exit gate:** zero `.from()` outside `src/data/**`, verified by the architecture test (not by grep-and-hope). App behaves identically across a manual smoke of every route.

---

### Phase 2 — Org backbone + RLS + technicians · 2.5–3 weeks · **← Milestone 1**

Still one org, but the isolation becomes real.

- **2a.** Create the tenancy tables. Seed one org: Tal Hermon, `slug='tal-hermon'`, plan `pro`, subscription `active`.
- **2b.** Seed `technicians` with `legacy_code='t1'/'t2'` from `src/data/technicians.ts`, real UUIDs.
- **2c.** Add `org_id` to every existing table — **nullable first, backfill, then `SET NOT NULL`, as three separate migrations.** Never add a `NOT NULL` column to a populated table in one shot.
- **2d.** Migrate `t1`/`t2` → UUIDs across `malfunctions`, `installations`, `ongoing_services`, `scheduled_filter_services`, `approved_schedule_days`, `profiles`: add nullable `technician_uuid`, `UPDATE ... FROM technicians t WHERE x.technician_id = t.legacy_code`, then **verify** `count(*) WHERE technician_id IS NOT NULL AND technician_uuid IS NULL` = 0. Keep **both** columns through Phase 6; the repository writes both. Rolling back a dropped column means restoring from backup; rolling back an unused column means ignoring it.
- **2e.** Composite uniques: `customers(org_id, import_key)`, `scheduled_filter_services(org_id, job_key)`, `approved_schedule_days(org_id, technician_uuid, service_date)`. Drop the old globals only after the new ones validate.
- **2f.** Custom access token hook + the `auth_org_id()` family. Verify claims land by decoding a fresh JWT.
- **2g. Rewrite `AuthContext.tsx`** — delete the async profile effect (`:59-98`), read claims synchronously from `session.user.app_metadata` inside the existing sync callback. **Fail closed:** no `org_id` claim → no access, redirect to a "no organization" screen, never a default role.
- **2h.** RLS on all tenant tables — four policies each using `(select auth_org_id())`. Rewrite the `db-cust-` policy (Phase 4 removes the prefix). `ALTER TABLE ... FORCE ROW LEVEL SECURITY` so the owner is subject to policies too. `set_org_id()` trigger everywhere.
- **2i.** Indexes with `org_id` leading. Run `EXPLAIN ANALYZE` on the full-table paginated customers query (`useCustomers.ts:142-190`) before and after. If the plan shows a per-row filter rather than an index scan, the predicate is wrong — fix it now, because it is invisible at 1 tenant and fatal at 20.
- **2j. Delete `src/data/technicians.ts`.** 14 importers. The dangerous ones: `technicians[0].id` at `MonthlyScheduleBoard.tsx:146,781`, `DailyRoutePage.tsx:23`, `TechnicianView.tsx:42`, `UsersPage.tsx:38,69` (throws on empty array) and `.slice(0,2)` at `WeeklyScheduleBoard.tsx:270,328` (silently drops technician 3+). Each needs an explicit empty/loading branch. Budget a full day for these 14 files alone.

**Entry gate:** Phase 1 exit + fresh `pg_dump` + PITR confirmed.

**Exit gate — the M1 acceptance test:** create a second org with a second user via SQL. Log in as user B; assert zero rows of org A are visible from any route. Then, **critically**, assert the same from a raw `curl` against PostgREST with user B's JWT — because the repository's client-side `.eq('org_id')` will mask a broken policy in the UI. **Test the database, not the app.** Wire that assertion into CI on every PR, then delete the test org.

---

### Phase 3 — Extract config, install locale/i18n seams · 1.5–2 weeks

1. `OrgConfigProvider` reading `org_settings`, mounted between `AuthProvider` and `JobsProvider` in `src/App.tsx:50,62`. Blocking spinner until settings load — every downstream scheduling calculation depends on them.
2. `src/lib/schedulePolicy.ts`: `isWorkingDay(date, settings)`, `getDayWindow(settings)`, `getDayCapacity(settings)`. Replaces the 5 inline weekend checks (`MonthlyScheduleBoard.tsx:258-265`, `WorkSchedulePage.tsx:116-122`, `AddTaskToScheduleDialog.tsx:31`, `FollowUpTasksPopover.tsx:127-130`, `WeeklyScheduleBoard.tsx:261,359`), both `10 * 60` day-start copies, `perDay = 3`, and the `< 15`. **Add the missing end-of-day cap** — `calculateTimeRanges` currently runs unbounded past midnight.
3. `src/i18n/`: `t()` + `he.ts` dictionary, seeded from `STATUS_CONFIG`, `SERVICE_TRACK_CONFIG`, `JOB_TYPE_CONFIG` — those three constants move **out of `src/types/index.ts`** entirely, leaving that module holding only types.
4. `useFormat()` wrapping `src/lib/dates.ts`; the `he-IL`/`Asia/Jerusalem` literals become defaults, not constants.
5. Set `lang`/`dir` on `<html>` from settings; remove the ~50 per-element `dir="rtl"` opportunistically as files are touched. Logical-property ESLint rule as **warn** with a ratchet.
6. `src/lib/geography.ts` façade over `areas.ts` + `generated/settlementAreas.ts`, selected by `org_settings.geography_source`. The 2600-line CBS file stays — it just becomes one provider behind an interface. Same treatment for `whatsapp.ts` and `googleMapsConfig.ts`.
7. **Runtime theming — a genuinely ~30-line feature.** `OrgConfigProvider` writes `--primary`/`--accent` raw HSL onto `document.documentElement.style`. Because `src/index.css` maps `--color-primary: hsl(var(--primary))` inside `@theme inline`, every existing Tailwind utility repaints with **no component changes**. The Tailwind v4 setup is already correct for this.
8. Branding from `settings.branding`: `AppLayout.tsx:134`'s `<h1>`, `logo.png` (imported at `AppLayout.tsx:1`, `LoginPage.tsx:11`), and the WhatsApp template embedding the company name at `DayApprovalDialog.tsx:244`.
9. `index.html` / `site.webmanifest` / `sw.js` stay Tal Hermon-branded — per-tenant PWA manifests are Phase 6 and genuinely fiddly. Note it, don't do it.

**Exit gate:** grep finds zero remaining `dow !== 5`, zero `10 * 60`, zero `he-IL`/`Asia/Jerusalem` outside `dates.ts` defaults. Changing `org_settings.working_days` to `{1,2,3,4,5}` visibly moves the weekend in the UI.

---

### Phase 4 — Polymorphic `jobs` · 3–4 weeks · **the hard one**

- **4a.** Create `job_types` (seed 3 rows reusing the keys from `src/types/index.ts:1`) and `jobs` (empty). No writes yet.
- **4b. Backfill script** — idempotent, re-runnable, `legacy_table`+`legacy_id` on every row:
  - `malfunctions` → `job_type.key='malfunction'` (`description` → `notes`)
  - `installations` → `installation` (`product_type` → `title`)
  - `ongoing_services` + `scheduled_filter_services` → `filter_replacement`, with the **`db-cust-` fix**: `customer_id = NULLIF(replace(old.customer_id,'db-cust-',''),'')::uuid`, guarded by a UUID-shape regex; failures land `NULL` with the raw value in `legacy_customer_ref`. **Count them first:** `SELECT count(*) FROM ongoing_services WHERE customer_id IS NOT NULL AND customer_id !~ '^db-cust-[0-9a-f-]{36}$'`. If nonzero, triage before writing the migration, not during.
  - Never-materialized synthetic filter jobs → generate rows for the current and next cycle from `customers.filter_replacement_month`. **This is where hidden state becomes real rows** and where the most surprises live — those jobs exist only in React memory today and have never been validated against anything.
- **4c. Parallel running, 2–4 weeks minimum.** `src/data/repositories/jobs.ts` gets two implementations behind `VITE_JOBS_BACKEND=legacy|unified`. While `legacy` is live, Postgres triggers on the 4 old tables mirror writes into `jobs` (matched on `legacy_table`+`legacy_id`), so `jobs` stays continuously warm. A nightly reconciliation asserts row counts and field equality; drift surfaces as a mapping bug while `legacy` is still authoritative. Flip to `unified` after a clean week; reverse the trigger direction so `legacy` stays a working rollback for another 2 weeks. **Rollback is a Netlify env-var change — a 60-second redeploy, no data restore.**
- **4d.** Delete the synthetic-job machinery; both roll-forward copies collapse into one `advanceRecurrence(job, jobType, settings)` driven by `job_types.recurrence_kind`. This also finally connects `ServiceTrack.intervalMonths` to actual job generation, which it has never done.
- **4e.** Retire the `idConventions.ts` prefixes and `getDbJobRef` (`dbJobSync.ts:44-60`). Keep `db-cust-` parsing one more phase as an inbound shim, then delete.

**Entry gate:** M1 passed; reconciliation clean 7 consecutive days; fresh `pg_dump`; a **rehearsed** rollback runbook — actually rehearsed on a restored copy, not just written.
**Exit gate:** 14 days on `unified` with zero rollbacks; old tables `REVOKE`d to read-only.

---

### Phase 5 — Super-admin console + provisioning · 1.5–2 weeks

Route `/admin/*` gated on `is_platform_admin()`, backed by an edge function `platform-admin` holding the service-role key. **Never expose service-role in the browser.**

Capabilities: list orgs; create org (slug, name, plan, seats, trial end); create owner user + membership; suspend/reactivate; impersonate **with a mandatory audit row** (impersonation without audit is how you lose a security review); seed `org_settings` + `job_types` + one technician from a template.

Refactor the recovered `admin-create-user` to be org-aware: write a `memberships` row, seat-check against `org_subscriptions.seats`, and refuse to create a user in an org the caller isn't an admin of.

`billing_provider`/`billing_ref` stay NULL — that's the Stripe seam. A webhook handler flipping `status` and `seats` later, nothing else changes.

---

### Phase 6 — Tenant shell · 2 weeks

**Subdomain in prod** (`{slug}.app.example.com`, wildcard DNS + Netlify wildcard domain), `?org=` in dev. **Not a path segment** — `/:orgSlug/*` means touching every `<Link>` and `navigate()` in the app; subdomain costs nothing at the routing layer.

Resolution order: subdomain → JWT `org_id` → default membership. A mismatch between subdomain and JWT org means refresh the session with the subdomain's org (if the user is a member) or hard-fail. **Never render with a mismatch.**

Per-tenant PWA manifest served dynamically per subdomain (Netlify edge function reading `settings.branding`), per-tenant favicon/theme-color. **`public/sw.js:1,27` cache keys need the org slug** or tenants poison each other's caches — a real, nasty bug class.

Also: rename the package from `vite_react_shadcn_ts`.

---

### Phase 7 — Decommission · 1 week

Drop `malfunctions`, `installations`, `ongoing_services`, `scheduled_filter_services`, `profiles`; the `technician_id text` columns; `technicians.legacy_code`; `jobs.legacy_*`; the `is_admin()`/`current_technician_id()` shims and the `app_role` enum. Delete the `legacy` repository implementation and the mirror triggers. Full backup before each drop.

---

## Timeline

**14–19 weeks of focused work**, realistically **4.5–6 months calendar** for a solo dev supporting a live customer — Phases 2 and 4 have mandatory soak periods that cannot be compressed. The gates are what make it slow and what make it survivable.

| Phase | Weeks | Ships to customers? |
|---|---|---|
| 0 — Repatriate schema | 1 | No |
| 1 — Repository layer | 1.5–2 | Continuously (no-op) |
| **2 — Org backbone + RLS ← M1** | **2.5–3** | No |
| 3 — Config + locale seams | 1.5–2 | Yes (theming) |
| 4 — Polymorphic jobs | 3–4 | Behind a flag |
| 5 — Super-admin console | 1.5–2 | Internal only |
| 6 — Tenant shell | 2 | Second tenant onboards |
| 7 — Decommission | 1 | No |

---

## Delete or defer

**Delete now (Phase 0/1):**
- `src/lib/malfunctionCsvParser.ts`, `src/lib/installationCsvParser.ts` — zero importers
- `src/pages/Index.tsx` — leftover Lovable scaffold
- `src/components/ui/chart.tsx` + `recharts` — unused boilerplate
- Make.com references in `CLAUDE.md:51-63`, `README.md:75`, `AGENTS.md:34,38`, `HANDOFF_make_supabase_sync.md`. If `receive-from-make`/`send-to-make` are already gone from prod, delete the Make half of `src/lib/sync.test.ts` rather than resurrecting `_shared/makePayload`. **Check first** whether `enforce_employee_job_update` still depends on the `source` column — `dbJobSync.ts:135-139` says it does.
- `src/lib/icsParser.ts` + the Outlook CSV import path — one-time backfill tooling for one customer. Multi-tenant import must be a supervised, org-scoped super-admin feature, not a bundled client-side parser. Move the logic to `scripts/`.

**Rewrite, don't migrate:**
- `src/pages/CustomerConfirmation.tsx` (106 lines) — reads query params, falls back to **hardcoded Hebrew demo names**, and clicking confirm calls `setStatus()` which writes nothing anywhere. There is nothing to migrate. Delete it and the `/confirm` route now; rebuild later as a signed-token endpoint hitting an edge function that writes `jobs.status`. Shipping a fake confirmation page to paying tenants is worse than shipping no page.

**Defer explicitly — write these into `CLAUDE.md` as non-goals so they survive context resets:**
- Stripe / self-serve signup (schema seam only)
- Server-side notifications. Note `push_subscriptions` currently collects subscriptions that **nothing ever sends to** — either build the sender or stop prompting; a permission prompt leading nowhere is worse than none.
- Route optimization (`useDirectionsRoute.ts:88` sets `optimizeWaypoints: false`)
- Dashboards / KPIs
- The 486-string i18n extraction
- **Splitting `useJobs.ts` (1287 lines) and `MonthlyScheduleBoard.tsx` (1424 lines) as standalone refactors.** They shrink as a *side effect* of Phases 1, 3, and 4. A separate refactor of hook-order-fragile code with zero component tests is unforced risk.

---

## Risk register

**R1 — Solo dev migrating a live prod DB with one real paying customer. (Critical / Likely)**
No staging, no rehearsal, no rollback = business-ending for that relationship. Mitigations in priority order: (a) **confirm PITR is on before Phase 0 exits** — if it isn't, that's the single most urgent item in this document; (b) `pg_dump` before every migration, no exceptions; (c) a **restored production clone** that every Phase 2/4 migration runs against first — the closest thing to a staging env, worth 2 days to set up; (d) expand/contract only — add nullable, backfill, verify, constrain; (e) migrate during the customer's off-hours (Friday, given Sun–Thu working days) in a pre-agreed window; (f) **tell the customer.** A scheduled 2-hour window is a partnership; an unexplained outage is a churn event.

**R2 — RLS looks right in the UI, is broken at the API. (Critical / Moderate)**
The repository's client-side `.eq('org_id')` masks policy bugs perfectly. Mitigation: the M1 gate tests via raw `curl` against PostgREST with a second tenant's JWT, in CI, on every PR. `FORCE ROW LEVEL SECURITY` everywhere. Never test isolation through the app.

**R3 — RLS performance collapse discovered at tenant 20. (High / Likely with the wrong pattern)**
Invisible at 1 tenant. Mitigation: `(select auth_org_id())` InitPlan wrapping; JWT claims not memberships subqueries; `org_id` leading on every index; an `EXPLAIN ANALYZE` regression check in CI on the 5 hottest queries starting with `useCustomers.ts:142-190`; seed a load-test org with 50k customers / 200k jobs during Phase 2 and keep it.

**R4 — Phase 4 backfill silently loses or mangles data. (High / Moderate)**
Especially the `db-cust-` strip and the never-materialized synthetic jobs. Mitigation: count-and-classify malformed `customer_id` values *before* writing the migration; `legacy_*` columns on every row; nightly reconciliation during parallel running; env-var rollback; old tables read-only for 2 weeks post-cutover.

**R5 — The `t1`/`t2` removal breaks the UI in 14 files. (Medium / Likely)**
`technicians[0].id` throws on empty; `.slice(0,2)` silently truncates. Mitigation: dual-column migration so data is never at risk; do the 14 files as one atomic PR; **add the first component-render tests** for `MonthlyScheduleBoard`, `WeeklyScheduleBoard`, `DailyRoutePage`, `TechnicianView`, `UsersPage` with 0, 1, 2, and 5 technicians *before* touching them. Highest-leverage test investment in the project.

**R6 — Realtime cross-talk between tenants. (High / Certain if unaddressed)**
Four hooks use hardcoded global channel names; two tenants on the same channel receive each other's invalidation events — a metadata leak and a correctness bug. Mitigation: `src/data/realtime.ts` in Phase 1, before any second tenant exists.

**R7 — JWT claim staleness. (Medium / Moderate)**
A revoked membership or suspended subscription stays effective up to an hour. Mitigation: authoritative membership check on `WITH CHECK` write policies only; shorten JWT TTL to 15 min if it matters; the super-admin `revoke` action also invalidates refresh tokens.

**R8 — Scope creep into dashboards/billing/notifications before M1 ships. (High / Very likely)**
Everything in "missing SaaS features" is more fun than RLS policies. Mitigation: nothing customer-facing merges before the Phase 2 M1 gate; the deferral list goes into `CLAUDE.md`.

**R9 — Config extraction silently changes behavior for the live customer. (Medium / Moderate)**
The `perDay=3` vs `<15` mismatch and the stale "15" comment mean current behavior is not what anyone believes it is. Mitigation: seed `org_settings` to reproduce *observed* behavior exactly, inconsistency included (`soft=3`, `hard=15`); fix the inconsistency in a separate, announced change.

**R10 — Phase 0 reveals the live schema differs from `types.ts` in ways that invalidate this plan. (Medium / Likely)**
It already does — `push_subscriptions` is missing and two triggers exist only in comments. Mitigation: treat the Phase 0 `db pull` as a genuine discovery step and **re-review this plan against the real baseline before starting Phase 2.**

---

## Verification per phase

| Phase | How you know it worked |
|---|---|
| 0 | `supabase db diff` vs prod returns empty; `supabase db reset` reproduces prod from migrations; 14/14 tests green |
| 1 | `src/data/architecture.test.ts` finds zero `.from()` outside `src/data/**`; manual smoke of all 11 routes; repository unit tests pass |
| **2** | **Second org + second user; `curl` PostgREST with user B's JWT returns zero org-A rows on every table; wired into CI. `EXPLAIN ANALYZE` shows index scans, not per-row filters** |
| 3 | Flip `org_settings.working_days` to `{1,2,3,4,5}` → weekend visibly moves. Flip `branding.primary_hsl` → app repaints with no rebuild. Zero grep hits for the extracted literals |
| 4 | Nightly reconciliation reports zero drift for 7 days on `legacy`; 14 days on `unified` with zero rollbacks; `VITE_JOBS_BACKEND=legacy` still boots correctly |
| 5 | Provision a throwaway org end-to-end from the console; confirm seat limits reject over-provisioning; confirm impersonation writes an audit row |
| 6 | Two subdomains, two browsers, two tenants side by side with distinct branding, no SW cache bleed, no realtime crosstalk |
| 7 | Full test suite + smoke after each drop; prior backup restorable |

---

## Critical files

- `.gitignore:57-58` — remove the global `*.sql`; scope to `config.toml`/`.env`
- `src/contexts/AuthContext.tsx` — JWT claims, fail-closed, delete the async profile effect (`:59-98`)
- `src/integrations/supabase/client.ts` → becomes `src/data/db.ts` (`supabaseUnsafe`, the enforcement chokepoint)
- `src/hooks/useJobs.ts` — 12 `.from()` sites, both recurrence roll-forwards (`:753-783`, `:855-892`), `recalcNextServiceDate` (`:1201-1217`)
- `src/data/technicians.ts` — deleted in Phase 2; 14 importers
- `src/components/monthly-schedule/utils.ts` — `perDay=3` (`:44`), `10*60` day start (`:73`), `generateFilterJobs` (`:6-26`)
- `src/lib/idConventions.ts` + `src/lib/dbJobSync.ts` — the prefix system Phase 4 dismantles
- `src/types/index.ts` — `SERVICE_TRACK_CONFIG`/`JOB_TYPE_CONFIG`/`STATUS_CONFIG` move to `src/i18n/` + `job_types`
- `src/App.tsx:50,62` — `OrgConfigProvider` mounts between `AuthProvider` and `JobsProvider`

---

## Start here

The first three actions, in order, before any code:

1. **Check whether PITR is enabled** on the Supabase project. If it isn't, nothing else in this plan is safe.
2. **`supabase db pull` + `supabase functions download`**, then read the baseline carefully. Expect it to contradict `types.ts`.
3. **Re-review this plan against that real baseline** before committing to Phase 2's schema.
