# Repository Guidelines

## Project Structure & Module Organization

This is a Vite 5 + React 18 + TypeScript app for Hebrew RTL field-service routing. Main app code lives in `src/`: pages in `src/pages`, reusable components in `src/components`, shadcn/ui primitives in `src/components/ui`, hooks in `src/hooks`, shared types in `src/types`, parsers/utilities in `src/lib`, and mock/bootstrap data in `src/data`. Static import files and assets live in `public/` and `src/assets/`. Supabase migrations are in `supabase/migrations`, and Edge Functions are in `supabase/functions`.

## Build, Test, and Development Commands

Use pnpm because this repo includes `pnpm-lock.yaml`.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the Vite dev server.
- `pnpm build` creates a production build.
- `pnpm build:dev` builds in development mode.
- `pnpm lint` runs ESLint across the repo.
- `pnpm test` runs Vitest once.
- `pnpm test:watch` runs Vitest in watch mode.
- `pnpm preview` serves the built app locally.

## Coding Style & Naming Conventions

Write strict TypeScript and keep components small, typed, and readable. Use PascalCase for React components and pages, `useX` for hooks, camelCase for functions/variables, and domain unions from `src/types/index.ts` instead of repeated string literals. Prefer the `@/` path alias over deep relative imports.

For UI, use Tailwind CSS v4 through the `@tailwindcss/vite` plugin. Theme tokens live in `src/index.css` under `@theme inline`; prefer semantic utilities such as `bg-primary`, `text-secondary`, `border-border`, `shadow-card`, and `animate-slide-in` instead of hard-coded values when a token exists. Do not add new Tailwind config unless a tool specifically requires it; keep shared design tokens in CSS. Keep RTL support intact: prefer `text-start`, `text-end`, `ms-*`, and `me-*` over left/right-specific classes.

## Testing Guidelines

Tests use Vitest with jsdom and Testing Library setup in `src/test/setup.ts`. Place tests under `src/` with `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx`. Focus tests on business rules, parsers, hooks, and user-facing behavior. Run `pnpm test` for changed logic and `pnpm lint` before handing off.

## Commit & Pull Request Guidelines

Recent history uses short descriptive commits such as `Changes`, `Update plan`, and Hebrew summaries. Prefer clearer imperative messages going forward, for example `Add route completion validation` or `Fix RTL schedule layout`.

Pull requests should include a concise summary, changed areas, test results, linked issues when relevant, and screenshots or short recordings for UI changes. Call out Supabase migrations, Edge Function changes, environment variables, and Make.com or Google Maps integration impacts.

## Security & Configuration Tips

Do not commit `.env` files or secrets. Google Maps keys should flow through `get-google-maps-key`; Make.com webhooks belong in Supabase secrets. Be careful with RLS, auth, billing, and webhook paths. Use Google Maps for mapping work; do not introduce Leaflet or Mapbox unless the architecture changes intentionally.
