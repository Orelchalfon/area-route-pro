---
name: senior-refactor
description: >-
  Senior-level, safety-first codebase cleanup and refactor workflow. Use when
  asked to audit, clean up, reorganize, split large files, extract hooks/types,
  or improve structure/performance/security of a React / Next.js / TypeScript /
  Tailwind / Supabase codebase. Invoke as `/senior-refactor audit | plan |
  execute | review-only`.
argument-hint: "audit | plan | execute | review-only"
---

# Senior Refactor

A reusable, **safety-first** refactoring workflow that audits, plans, and
executes senior-level cleanup of a codebase. It is opinionated about React /
Next.js / TypeScript / Tailwind / Supabase, and it never rewrites the whole
project blindly.

## Detected project context (this repo)

This repo is **Vite + React 18 + React Router + TypeScript + Tailwind v4 +
shadcn/ui + Supabase**, package manager **pnpm**, with **RTL / Hebrew** UI.
There is **no Next.js** here, so skip Next-specific advice (server/client
components, `use client`) unless the repo actually adopts it. Validation
commands for this repo:

- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`

Re-detect on every run (see Audit) — do not hardcode assumptions if the repo changed.

## Modes — `$ARGUMENTS`

The first argument selects the mode. If `$ARGUMENTS` is empty, default to
`audit`.

| `$ARGUMENTS` | Mode | What it does |
|---|---|---|
| `audit` | Read-only | Inspect structure, find problems, rank impact. No edits. |
| `plan` | Read-only | Turn the audit into a phased, batched execution plan. No edits. |
| `execute` | Edits | Apply **one logical batch at a time**, validating after each. |
| `review-only` | Read-only | Performance + security + quality review, no structural edits. |

Parse it like this:

```
mode = (first word of $ARGUMENTS) or "audit"
target = (rest of $ARGUMENTS, optional) — a path/glob to scope the work
```

If `$ARGUMENTS` includes a path (e.g. `execute src/components/MonthlyScheduleBoard.tsx`),
scope the run to that file/folder.

---

## Golden rules (always, every mode)

1. **Inspect before touching.** Read repo structure, `package.json`, ts/lint
   config, routing, and entry points first.
2. **Check git status first.** Run `git status --short`. If the working tree
   has uncommitted changes, **warn the user and ask** before editing risky
   files. Never bury their in-progress work.
3. **Small, reviewable change groups.** Prefer one logical batch → validate →
   (optionally) commit, over a giant rewrite.
4. **Never delete a file** until replacement imports are confirmed wired up
   **and** typecheck/tests pass.
5. **Do not change public behavior** unless explicitly requested. Refactor =
   same behavior, better structure.
6. **No new dependencies** unless there is a strong, stated reason and the user
   agrees.
7. **Preserve the existing styling system, RTL, and Hebrew behavior.** See
   `checklists/rtl-hebrew-review.md`.
8. **Don't split purely by line count.** 300 lines is a *smell threshold*, not
   a rule. Split when responsibilities are separable (see Refactor rules).

---

## Workflow by mode

### `audit`

1. **Detect** framework + package manager (lockfile: `pnpm-lock.yaml` → pnpm,
   `yarn.lock` → yarn, `package-lock.json` → npm, `bun.lockb` → bun). Detect
   framework from deps: `next` → Next.js, `vite` → Vite, etc.
2. **Read** `package.json` scripts, `tsconfig*.json`, lint config, folder
   layout, routing (`src/pages`, `app/`, or router config), and the main entry
   (`src/main.tsx` / `app/layout.tsx`).
3. **Find large files**: run
   `node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs`.
4. **Classify** each large file: **must split now** / **should split later** /
   **acceptable exception** (e.g. generated `types.ts`, shadcn primitives).
5. **Identify smells**: duplicated UI patterns, repeated logic, mixed concerns,
   weak naming, oversized hooks/components, dead code, unsafe `any`, poor folder
   structure, prop drilling, performance issues, Supabase/security risks.
6. **Emit the Audit report** (format below). **No edits.**

Use the checklists as your lens:
- `checklists/react-component-splitting.md`
- `checklists/typescript-quality.md`
- `checklists/performance-review.md`
- `checklists/security-review.md`
- `checklists/rtl-hebrew-review.md`
- `checklists/database-supabase-review.md`

### `plan`

Produce a phased plan (format below). Each phase lists concrete batches with
files, reason, risk, and the validation command. **No edits.**

### `execute`

1. Re-check `git status`. Warn on a dirty tree.
2. Pick the **next single batch** from the plan (or build a minimal plan if none
   exists). Do **not** run all batches unless the user explicitly says
   "full execution" / "do everything".
3. **Before the batch**, show: files to edit · reason · expected risk ·
   validation command.
4. Apply the edits with clean, minimal diffs.
5. **After the batch**, run available validations in order: typecheck → lint →
   tests → build (build only if reasonably fast). Fix anything the batch broke.
6. Append to the running **Changelog** in your reply.
7. Stop and report. Wait for the user to approve the next batch.

### `review-only`

Run `performance-review.md`, `security-review.md`, `typescript-quality.md`, and
`rtl-hebrew-review.md` as read-only checks. Report findings ranked by impact +
severity. Propose fixes but **do not edit**.

---

## Refactor rules (the "when to split" doctrine)

- **Max preferred file size: 300 lines.** Treat as a smell, not a mandate.
- Split when a file mixes **separable responsibilities**: layout · data fetching
  · form logic · table/list rendering · modal/dialog · card/item · custom hook ·
  validation/schema · constants/config · types · utilities.
- **Keep components close to usage.** Co-locate; only promote to a shared folder
  when reused across features.
- **Feature-based folders** before global `shared/` dumping grounds.
- **Prefer named exports.** Avoid default exports for components.
- **Avoid barrel files** (`index.ts` re-exports) unless the repo already uses
  them consistently.
- Preserve the existing **styling system**, **RTL**, and **Hebrew** strings.

React/Next specifics live in `checklists/react-component-splitting.md`.
Supabase specifics live in `checklists/database-supabase-review.md`.

---

## Output formats

### Audit output

```
## Executive summary
<3–6 sentences: health, biggest risks, quick wins>

## Top 10 highest-impact refactors
1. <file/area> — <what + why it matters> — <impact / effort>
...

## Files over 300 lines
| File | Lines | Type | Classification | Reason |
|------|-------|------|----------------|--------|

## Component splitting candidates
| File | Responsibilities found | Suggested extractions |

## Risk map
| Area | Risk | Likelihood | Blast radius | Mitigation |

## Suggested execution order
<ordered, dependency-aware list of batches>
```

### Plan output

```
## Phase 1 — Safe cleanup (dead code, naming, unused imports, formatting)
## Phase 2 — Component splitting
## Phase 3 — Hooks / utils / types extraction
## Phase 4 — Performance & security pass
## Phase 5 — Final validation (typecheck, lint, test, build)
```

Each phase: a list of **batches**, each with `files · reason · risk ·
validation command`.

### Execute output

For each batch: the pre-batch summary, the diff/edits, the validation results,
and a cumulative **Changelog** section:

```
## Changelog
- [batch N] <what changed> — validations: tsc ✅ lint ✅ test ✅ build ⏭️
```

---

## Subagents (optional, in `.claude/agents/`)

Delegate only when the user asks, or when a phase clearly maps to one:

- **refactor-planner** — read-only; produces the safe phased plan.
- **component-splitter** — can edit; extracts React components preserving behavior.
- **test-guardian** — read-only + bash; runs typecheck/lint/test/build, explains failures.
- **performance-security-reviewer** — read-only; React perf, Supabase security, secrets, risky client code.

## Examples

```
/senior-refactor audit
/senior-refactor plan
/senior-refactor execute
/senior-refactor execute src/components/MonthlyScheduleBoard.tsx
/senior-refactor review-only
```

Recommended first command on an unfamiliar repo: **`/senior-refactor audit`**.
