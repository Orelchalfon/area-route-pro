# Checklist — TypeScript quality

## Type safety

- [ ] No unsafe `any`. Replace with a real type, `unknown` + narrowing, or a generic.
- [ ] No `as` casts that lie about shape; prefer type guards / schema parsing.
- [ ] No `@ts-ignore` / `@ts-expect-error` without a comment explaining why.
- [ ] Function params and public return types are explicit where non-trivial.
- [ ] Discriminated unions for state machines instead of many optional booleans.
- [ ] `zod` schemas are the source of truth; derive types with `z.infer<>`.

## Naming & structure

- [ ] Names describe intent, not implementation (`activeJobs`, not `arr2`).
- [ ] Booleans read as predicates (`isLoading`, `hasError`, `canEdit`).
- [ ] Files export one clear concept; types live near their usage.
- [ ] No dead exports / unused types (check with lint + `tsc`).
- [ ] Consistent import ordering; no deep relative chains (`../../../`) where an
      alias (`@/`) exists.

## API & data shapes

- [ ] Supabase row types come from generated `integrations/supabase/types.ts`,
      not hand-rolled duplicates that can drift.
- [ ] Nullable DB columns are modeled as nullable in TS; handle `null` explicitly.
- [ ] Don't widen generated types with `any` — extend with `&` or `Pick`.

## Validation commands (this repo)

- [ ] `pnpm exec tsc --noEmit` — full typecheck, no emit.
- [ ] `pnpm lint` — eslint (typescript-eslint, react-hooks rules).

## Common fixes

- [ ] Replace `props: any` with a declared `Props` interface.
- [ ] Replace `e: any` handlers with proper React event types.
- [ ] Replace index-signature `Record<string, any>` with a precise union/shape.
- [ ] Turn repeated inline shapes into a shared named type.
