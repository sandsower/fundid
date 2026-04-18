# Hurl E2E tests

End-to-end specs for fundid. Run against a local Supabase stack; no remote
services required.

## Why this shape

See the vault notes for the scope decision:

- `fundid-hurl-plus-slim-supabase-e2e-stack` — Hurl + real-Supabase over
  Playwright + fakes
- `fakes-for-supabase-backfire-on-rls-postgis-migrations` — why Supabase
  itself isn't faked

## Prerequisites

- Docker (for Supabase containers)
- Supabase CLI — `supabase --version` (tested on 2.84.2)
- Hurl — `hurl --version` (tested on 7.x)
  - On Arch: `sudo pacman -S hurl`. The upstream GitHub binary is linked
    against `libxml2.so.2` and fails on Arch 2.15 which ships SONAME `.16`.

## First-time setup

```
supabase start               # ~5 min cold, pulls images; ~30s on warm boot
supabase status              # copy the service_role key below
cp tests/hurl/.vars.local.example tests/hurl/.vars.local  # if example exists
```

`tests/hurl/.vars.local` must contain:

```
supabase_url=http://127.0.0.1:54321
service_role_key=<from `supabase status`>
publishable_key=<from `supabase status`>
base_url=http://localhost:5173
```

The file is gitignored.

## Running specs

Start the SvelteKit dev server in a second terminal:

```
pnpm dev
```

The `$env/dynamic/private` fallback in `/api/items` reads secrets from
`.env.local`, so `vite dev` is enough. `pnpm dev:cf` is currently broken
(wrangler 4.78 deprecated `-- proxy-command`) and is not needed for the
suite.

Run one spec:

```
hurl --test --variables-file tests/hurl/.vars.local tests/hurl/health.hurl
```

Run the full suite in parallel:

```
hurl --test --variables-file tests/hurl/.vars.local tests/hurl/*.hurl
```

Typical timings (measured):

| Scope | Time |
|---|---|
| Full suite (6 specs, parallel) | ~500 ms |
| `create-item.hurl` alone | ~2.7 s (Turnstile siteverify over network) |
| Other specs | 10–100 ms each |

## Reset between runs

`tests/hurl/reset.sh` — truncates writable tables and re-applies `seed.sql`.
~180 ms. Run before any spec that asserts exact counts or relies on clean
state.

```
tests/hurl/reset.sh
```

For migration changes, use `supabase db reset` instead (~13 s). Reset also
re-runs `seed.sql`.

## What each spec covers

| Spec | What it proves |
|---|---|
| `health.hurl` | `/api/health` shape (no DB) |
| `health-full.hurl` | SvelteKit reaches local Supabase, `database.ok: true` |
| `items-list.hurl` | Hurl + PostgREST + service-role auth |
| `nearby-items.hurl` | PostGIS RPC returns seeded items within radius |
| `create-roundtrip.hurl` | Capture + cross-request state + DELETE |
| `create-item.hurl` | Full `/api/items` route → Turnstile verify → insert → read-back → cleanup |

## Turnstile test keys

`.env.local` must contain Cloudflare's always-pass test keys so
`create-item.hurl` gets through the widget verification:

```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

The SvelteKit route reads `TURNSTILE_SECRET_KEY` via
`platform?.env?.X ?? env.X`, so both `vite dev` (reads `env`) and production
(reads `platform.env`) work without branching.

## Adding a spec

1. Write the `.hurl` file. Use `{{base_url}}`, `{{supabase_url}}`,
   `{{service_role_key}}` from `.vars.local`.
2. If it mutates state, call `reset.sh` before running or add a cleanup
   request at the end of the spec (see `create-item.hurl`).
3. Verify locally: `hurl --test --variables-file tests/hurl/.vars.local
   tests/hurl/<your>.hurl`.

## Known gaps

- **No CI job yet** — add via `.github/workflows/*.yml` using
  `supabase start` on an ubuntu runner.
- **Peripheral fakes unimplemented** — KV, R2, Resend, Nominatim,
  `send-email` edge function all still hit real services or return
  undefined under `vite dev`. Tracked as a separate work stream.
- **Contact relay** (`/api/contact`) has no spec yet because Resend has no
  capture mechanism. Landing with the Resend fake.
