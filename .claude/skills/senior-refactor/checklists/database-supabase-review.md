# Checklist — Database / Supabase review

## Keys & access boundaries

- [ ] Client uses only the **anon/publishable** key. The **service role** key is
      never imported into client code or exposed via `VITE_*`. (See
      `security-review.md`.)
- [ ] Privileged / cross-user operations live in **Edge Functions** or server
      code, not the browser.

## RLS (Row Level Security)

- [ ] Every table the client reads/writes has RLS enabled with explicit policies.
- [ ] Policies match real access needs (owner-only vs shared vs public read).
- [ ] Don't rely on the UI hiding data — RLS must enforce it server-side.
- [ ] When adding a migration, include/confirm RLS policies for new tables.

## Query quality

- [ ] **No N+1 queries** — don't fire one query per list item in a loop/`map`.
      Use a single query with `.in(...)`, a join/embedded select
      (`select('*, related(*)')`), or an RPC.
- [ ] Select only needed columns; avoid `select('*')` on wide/hot tables.
- [ ] Pagination/limits on large tables (`.range()` / `.limit()`).
- [ ] Filters pushed to the DB (`.eq`, `.in`, `.gte`) instead of filtering in JS
      after fetching everything.

## Typed, centralized helpers

- [ ] DB row/insert/update types come from the generated
      `src/integrations/supabase/types.ts` — keep it in sync after schema changes
      (`supabase gen types` / MCP `generate_typescript_types`).
- [ ] Consider centralizing repeated query patterns into typed helper functions
      (e.g. `src/data/` or a `queries.ts`) **when** the same query is duplicated
      across components — don't over-abstract a one-off.
- [ ] TanStack Query keys are consistent and colocated with their helpers.

## Migrations

- [ ] New SQL migrations are additive and reversible where possible.
- [ ] Migration filenames follow the existing timestamped convention in
      `supabase/migrations/`.
- [ ] Don't apply destructive schema changes as part of a "cleanup" refactor
      without explicit confirmation.

## How to verify

- [ ] List tables and check RLS/advisors via Supabase MCP (`list_tables`,
      `get_advisors`) when available.
- [ ] Grep client code for `.from('<table>')` usage and cross-check policies.
