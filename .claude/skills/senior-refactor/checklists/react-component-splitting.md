# Checklist — React component splitting

Use when deciding **whether** and **how** to split a component. Splitting is
about separating responsibilities, not hitting a line count.

## When to split

Split when a single file contains two or more of these concerns:

- [ ] **Layout / page shell** — wrapping structure, grids, headers, sidebars.
- [ ] **Data fetching** — `useQuery`/`useMutation`, fetch effects, loading/error states.
- [ ] **Form logic** — `react-hook-form`, `zodResolver`, submit handlers.
- [ ] **Table / list rendering** — row mapping, column defs, virtualization.
- [ ] **Modal / dialog** — a self-contained dialog with its own state.
- [ ] **Card / item** — a repeated presentational unit.
- [ ] **Custom hook** — stateful, reusable logic with no JSX.
- [ ] **Validation / schema** — zod schemas, field constraints.
- [ ] **Constants / config** — option lists, status maps, column configs.
- [ ] **Types** — shared interfaces/types used by siblings.
- [ ] **Utilities** — pure helpers (formatting, sorting, grouping).

## How to split (preserve behavior)

- [ ] Extract **pure presentational** children first; pass data via typed props.
- [ ] Move **stateful reusable logic** into a `useXxx` hook colocated with the feature.
- [ ] Move **zod schemas + inferred types** into a `schema.ts` next to the form.
- [ ] Keep extracted pieces **co-located** with the parent (`./components`,
      `./hooks`) until they're reused across features — then promote to shared.
- [ ] **Named exports** only. No default-exported components.
- [ ] Don't add a barrel `index.ts` unless the repo already uses them.
- [ ] Keep prop types explicit; no `any`. Prefer `Pick`/`Omit` over re-declaring.
- [ ] Preserve all existing class names, RTL attributes, and Hebrew strings verbatim.

## React performance during splitting

- [ ] Memoize (`React.memo`, `useMemo`, `useCallback`) **only** when there's a
      measured/obvious re-render cost. Don't memoize by reflex.
- [ ] Keep extracted list items stable: pass primitive/stable props, stable keys.
- [ ] Don't create new object/array/function literals in render that defeat memo.
- [ ] Lift state no higher than needed; avoid prop drilling by using context or
      colocating state — but don't introduce context for one consumer.

## Next.js specifics (only if the repo uses Next)

- [ ] Keep **server components** as the default; add `"use client"` only when a
      component needs state, effects, or browser APIs.
- [ ] Push `"use client"` to the **leaves** — don't mark a whole page client.
- [ ] Keep data fetching in server components / route handlers where possible.
- [ ] Don't import server-only code into client components.

> This repo is **Vite + React Router**, not Next.js — skip the Next section
> unless Next is actually adopted.

## Anti-patterns to avoid

- [ ] Over-abstraction: a "generic" component used once.
- [ ] Splitting that creates 6 files passing props in a chain (prop drilling).
- [ ] Extracting a hook that's just a thin wrapper with no reuse.
- [ ] Breaking a cohesive component apart purely to get under 300 lines.
