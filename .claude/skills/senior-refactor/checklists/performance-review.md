# Checklist — Performance review

Measure or reason before optimizing. Don't add memoization noise without cause.

## React rendering

- [ ] Identify components that re-render on every parent render due to new inline
      object/array/function props; stabilize with `useMemo`/`useCallback` **where
      it matters**.
- [ ] Wrap expensive pure children in `React.memo` only when props are stable.
- [ ] Avoid heavy work in render; move derivations into `useMemo`.
- [ ] Large lists: virtualize or paginate; avoid rendering thousands of nodes.
- [ ] Stable, unique `key`s (not array index) for dynamic/reorderable lists
      (this repo uses `@hello-pangea/dnd` — keys matter for DnD correctness).
- [ ] Don't lift state higher than necessary; localized state re-renders less.

## Data fetching (TanStack Query)

- [ ] Sensible `queryKey`s; no over-broad invalidation that refetches everything.
- [ ] Use `select`, `staleTime`, and `enabled` to avoid redundant fetches.
- [ ] Avoid **N+1 query waterfalls** — batch related reads or use a single query
      with joins (see `database-supabase-review.md`).
- [ ] Mutations update/invalidate the minimal set of keys.

## Bundle & assets

- [ ] Code-split heavy routes/dialogs with `React.lazy` + `Suspense` where it pays off.
- [ ] Import icons/components granularly (e.g. `lucide-react` named imports).
- [ ] No accidental import of a huge lib for one helper.
- [ ] Images sized/optimized; avoid shipping unused assets.

## Effects & subscriptions

- [ ] `useEffect` deps are correct and minimal; no effects that should be derived state.
- [ ] Clean up subscriptions/timers/listeners on unmount.
- [ ] No effect that refetches on every render due to unstable deps.

## Validation

- [ ] `pnpm build` and review the Vite bundle output for size regressions.
- [ ] Sanity-check the largest files via the analyze script for hidden complexity.
