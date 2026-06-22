# Checklist — Security review

Focus on a client-heavy Vite + Supabase app. The browser bundle is public —
treat everything shipped to the client as readable by anyone.

## Secrets & keys

- [ ] **No service role key in client code or `VITE_` env vars.** Only the
      Supabase **anon/publishable** key belongs in the browser.
- [ ] Grep for leaked secrets: `service_role`, `SUPABASE_SERVICE`, private API
      keys, signing secrets, hardcoded tokens.
- [ ] `.env` files are gitignored; no secrets committed in history.
- [ ] Third-party keys (Google Maps, etc.) are restricted by referrer/scope.

## Supabase / data access

- [ ] **RLS is assumed ON** for every table the client reads/writes. If client
      code reads a table, there must be a matching RLS policy — flag any table
      relied on without one.
- [ ] No privileged operations performed from the client that should live in an
      Edge Function / server (bulk deletes, role changes, cross-user reads).
- [ ] User-supplied values are never interpolated into raw SQL; use the query
      builder / parameterized RPC.
- [ ] File/storage buckets have correct public/private settings and policies.

## Client-side risks

- [ ] No `dangerouslySetInnerHTML` with unsanitized user/DB content (XSS).
- [ ] External links use `rel="noopener noreferrer"` with `target="_blank"`.
- [ ] No `eval`, `new Function`, or dynamic script injection.
- [ ] Auth state checked before rendering protected UI; don't rely on hiding UI
      alone for authorization (server/RLS must enforce it).
- [ ] WhatsApp / external integrations don't leak PII in URLs or logs.

## Validation / handling

- [ ] All form input validated with zod before submit.
- [ ] Errors don't surface raw stack traces or DB details to users.
- [ ] No PII or tokens written to `console.log` in production paths.

## How to scan

- [ ] `grep -rinE "service_role|SUPABASE_SERVICE|secret|private_key" src` (review hits).
- [ ] Review `src/integrations/supabase/` for client initialization and key usage.
- [ ] Cross-check tables used in client queries against migrations for RLS policies.
