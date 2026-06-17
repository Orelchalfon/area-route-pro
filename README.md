# טל חרמון — Field Service Management

A field-service management web app (Hebrew, RTL): jobs, malfunctions, installations,
ongoing service, customers, daily route planning with Google Maps, and a customer
appointment-confirmation page.

## Tech stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (Postgres, Auth, Edge Functions)
- Google Maps (`@react-google-maps/api`)
- TanStack Query, React Router

## Local development

Requires Node.js 20+ (see `.nvmrc`) and npm.

```sh
npm install
cp .env.example .env        # then fill in your Supabase values
npm run dev                 # http://localhost:8080
```

### Environment variables

Copy `.env.example` to `.env` and set:

| Variable                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key              |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref                         |

These values are public (they ship in the client bundle) — security is enforced by
Supabase Auth + RLS, not by hiding them.

### Scripts

- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — ESLint
- `npm test` — Vitest

## Authentication

The app requires login (Supabase Auth, email/password). There is **no public sign-up
screen** — users are provisioned manually:

1. In the Supabase dashboard: **Authentication → Users → Add user** to create each user.
2. **Authentication → Providers → Email** → turn **off** "Enable sign-ups" so the public
   cannot self-register.

Unauthenticated visitors are redirected to `/login`. The only public route is `/confirm`
(the customer appointment-confirmation page), which does not access the database.

## Deployment (Netlify)

Deployment is configured in `netlify.toml` (build command, publish dir, Node version, and
the SPA fallback redirect required by React Router).

1. In Netlify, **Add new site → Import from Git** and select this GitHub repo.
   Build settings are read from `netlify.toml` (no manual config needed).
2. **Site settings → Environment variables**: add `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`.
3. Deploy. Pushes to the default branch trigger automatic deploys.

### Supabase setup (one-time, before/at first deploy)

1. **Apply migrations**, including `supabase/migrations/*_restrict_rls_to_authenticated.sql`,
   which locks all tables to authenticated users only. Apply with the Supabase CLI
   (`supabase db push`) or via the dashboard. **Create at least one auth user first**
   (see [Authentication](#authentication)) so you can still log in after RLS is tightened.
2. **Deploy the edge functions**: `get-google-maps-key`, `receive-from-make`, `send-to-make`
   (`supabase functions deploy <name>`).
3. **Set Supabase function secrets**:
   - `GOOGLE_MAPS_API_KEY` — used by `get-google-maps-key`. Restrict the key in Google Cloud
     Console (HTTP referrers / enabled APIs) since it is served to the browser at runtime.
   - `MAKE_WEBHOOK_SECRET` — shared secret validating Make → Supabase webhook calls.
