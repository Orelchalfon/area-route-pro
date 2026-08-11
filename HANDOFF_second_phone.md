# Brief: second phone number

Deferred from the 10/08/2026 session. Paste the section below into a fresh Claude Code
session. It needs a Supabase migration, which is why it was split out.

---

## Context

A customer often has two reachable numbers — their own and, say, a spouse's or a
relative's who is actually home during the visit. Today every table holds exactly one
`phone` column, so the second number has nowhere to live: the manager either overwrites the
main number or keeps it in their head. Add a proper second number to the customer card and
to the individual job.

Note the distinction that already exists and must not be broken: a job's `phone` is allowed
to differ from the customer card's on purpose (a one-off contact for that visit — the
"update the customer card too?" dialog in the picker exists precisely for this). The second
number is a *permanent additional* contact, not a replacement for that mechanism.

## Verified facts — trust these, do not re-explore

- Every relevant table has a single `phone` column and no second one — confirmed in
  `src/integrations/supabase/types.ts`: `customers` (:17-37), `malfunctions`,
  `installations`, `ongoing_services`.
- `malfunctions` / `installations` have **no `customer_id`** — their "customer" is
  synthesized from the job row (`db-malf-cust-*` / `db-inst-cust-*`). Use
  `resolveCustomerCard` (`src/lib/customerCardMatch.ts`) to find the real card; it matches
  by `customerImportKey` name then by digits-only phone, and deliberately refuses to match
  `db-ongoing-cust-*` by name.
- Column↔app mapping lives in `customerToRow` (`src/hooks/useCustomers.ts:75-91`) for
  customers, and `buildDbJobUpdatePatch` (`src/lib/dbJobSync.ts:137+`) plus the
  `build*Insert` helpers for jobs. `JobSyncPatch` is the patch type to extend.
- Job rows are read into `Job` by `malfToJobAndCustomer` / `instToJobAndCustomer`
  (`src/hooks/useMalfunctionsInstallations.ts:112-172`) and `ongoingToJobAndCustomer`
  (`src/hooks/useOngoingServices.ts:80-119`).
- Migrations live in `supabase/migrations/` and must be applied by hand in the Supabase
  dashboard before deploying. Do not set `source` on job updates — an RLS trigger rejects
  it (`dbJobSync.ts:141-144`).
- Forms here are plain `useState`; `zod`/`react-hook-form` are installed but unused in
  `src/`. Do not introduce them.
- Phone inputs use `type='tel' dir='ltr'`; the picker's editor uses `h-11 text-base`
  targets (`PickerJobEditForm.tsx`) because the users are not comfortable with screens.

## Work

1. **Migration** — add a nullable `phone2 text` to `customers`, `malfunctions`,
   `installations`, `ongoing_services`. New file under `supabase/migrations/`, following
   the naming of the existing ones. Regenerate / hand-update
   `src/integrations/supabase/types.ts` to match.
2. **Types** — add `phone2?: string` to `Customer` and `Job` (`src/types/index.ts`).
3. **Read paths** — map `phone2` through the three job mappers and `rowToCustomer`
   (`useCustomers.ts:~40-63`).
4. **Write paths** — `customerToRow`, `JobSyncPatch` + `buildDbJobUpdatePatch`, the
   `build*Insert` helpers, and `updateJob`'s accepted field list (`useJobs.ts:~954`).
5. **UI** — a second phone field, labelled `טלפון נוסף`, in: `PickerJobEditForm`,
   `JobEditDialog`, `CustomerEditDialog`, `NewCustomerDialog`, and the day-detail inline
   form (`useJobEditForm` + `DayDetailDialog`). Display it wherever the primary phone is
   shown with a click-to-call/WhatsApp affordance — check `CustomerInfoPopover`,
   `CustomerCard`, `TechnicianView` and the picker row.
6. **Search** — include `phone2` in `jobMatchesPickerSearch`
   (`src/components/monthly-schedule/dialogs/jobPickerSearch.ts`) and in the customer
   directory search (`useCustomerDirectory`), so either number finds the record.
7. **The propagate dialog** — `useJobDetailsSave` currently compares phone/address/city
   against the resolved card to decide whether to ask. Add `phone2` to that comparison and
   to `customerPatch`.

## Non-goals

No third number, no per-number labels/roles, no contact sub-table. Don't touch the
Make.com pipeline.

## Verification

- `pnpm lint`, `pnpm test`, `pnpm build`. Two test files already fail locally on
  gitignored imports — pre-existing, ignore them.
- Extend `src/lib/customerCardMatch.test.ts`: a job whose **second** number matches a
  card's primary (and vice versa) should still resolve to that card.
- Manual (`pnpm dev`, http://localhost:8080): add a second number on a customer card →
  confirm it shows on the board/picker and is searchable by that number. Then set a
  different second number on a single installation, choose **רק במשימה הזו**, and confirm
  the card keeps its own.
