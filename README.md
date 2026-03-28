<p align="center">
  <img src="brand/logo-icon.svg" width="64" height="88" alt="Fundid logo">
</p>

<h1 align="center">Fundid</h1>

<p align="center">
  Lost and found in Iceland<br>
  <a href="https://fundid.is">fundid.is</a> · <a href="https://dev.fundid.is">dev.fundid.is</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SvelteKit-5-ff3e00?logo=svelte&logoColor=white" alt="SvelteKit 5">
  <img src="https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/Supabase-PostGIS-3fcf8e?logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/lang-is%20%2F%20en-blue" alt="Bilingual">
</p>

---

Map-based PWA, anonymous contact relay, no accounts. Free and open.

## What it does

Anyone can post a lost or found item, pin it on the map, and get contacted through an anonymous email relay. Neither party sees the other's email. Claim codes verify item ownership when closing a listing. Bilingual (Icelandic/English).

12 categories: phone, wallet, keys, bag, glasses, clothing, jewelry, documents, electronics, pet, bicycle, other.

## Architecture

```
Browser (SvelteKit PWA)
  |
  +-- Supabase (PostgreSQL + PostGIS, RLS, pg_net)
  |     +-- Edge Function: send-email (Resend API)
  |
  +-- Cloudflare R2 (images, zero egress)
  |
  +-- Cloudflare Worker: data-retention (daily cron)
  |
  +-- MapLibre GL + OSM tiles
```

- SvelteKit 5 on Cloudflare Pages
- Supabase handles auth-free DB access with Row Level Security
- PostGIS spatial index for nearby item queries
- R2 stores images with CDN caching. KV backs upload rate limiting
- All email goes through Supabase Edge Functions via pg_net (async HTTP from Postgres)
- Data retention worker runs daily at 3am UTC

## Tech stack

| Layer | What |
|-------|------|
| Framework | SvelteKit 5, Svelte 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL 15, PostGIS) |
| Storage | Cloudflare R2 |
| Hosting | Cloudflare Pages + Workers |
| Maps | MapLibre GL + OpenStreetMap |
| Email | Resend (via Supabase Edge Function) |
| i18n | Tolgee |
| Analytics | PostHog (EU, cookieless) |
| Icons | Lucide |

## Getting started

### Prerequisites

- [pnpm](https://pnpm.io/) (npm install fails on this repo)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Cloudflare account with R2 enabled

### Setup

```bash
git clone git@github.com:sandsower/fundid.git
cd fundid
pnpm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Where | Purpose |
|----------|-------|---------|
| `PUBLIC_SUPABASE_URL` | App | Supabase project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | App | Supabase anon/public key |
| `PUBLIC_IMAGE_BASE_URL` | App | R2 image domain (e.g. `https://img.fundid.is`) |
| `PUBLIC_POSTHOG_KEY` | App (prod only) | PostHog project key |
| `RESEND_API_KEY` | Edge function | Resend email API key |
| `TOLGEE_API_KEY` | CLI only | For pulling/pushing translations |

### Supabase setup

```bash
supabase start
supabase db reset
```

This runs `schema.sql` and migrations `002` through `007`. The migrations create:

- `items` table with PostGIS geometry column and GiST index
- `contact_messages` with threaded conversations and rate limiting
- `resolve_attempts` with brute-force protection
- RPC functions for contact relay, claim verification, data cleanup
- RLS policies on all tables
- R2 replaces Supabase Storage (migration 007 is intentionally empty)

Deploy the edge function:

```bash
supabase functions deploy send-email
```

### Run dev

```bash
pnpm dev          # standard Vite dev server (no R2/KV bindings)
pnpm dev:cf       # Cloudflare Pages dev with R2 + KV emulation
```

`pnpm dev` works for most development. Use `pnpm dev:cf` when testing image uploads since that needs the R2 binding.

## Deployment

### Cloudflare Pages

The `wrangler.toml` at the repo root handles all bindings:

- Production: R2 bucket `fundid-item-images`, image domain `img.fundid.is`
- Preview: R2 bucket `fundid-item-images-dev`, image domain `dev-img.fundid.is`
- KV namespace `RATE_LIMIT` shared across environments

Deploy:

```bash
pnpm deploy:dev    # builds + deploys to dev branch
pnpm deploy:prod   # builds + deploys to main branch
```

### Infrastructure setup (one-time)

Create the R2 buckets:

```bash
wrangler r2 bucket create fundid-item-images
wrangler r2 bucket create fundid-item-images-dev
```

Create the KV namespace:

```bash
wrangler kv namespace create RATE_LIMIT
# Update the id in wrangler.toml with the returned value
```

Custom domains for R2 (configured via Cloudflare API or dashboard):

- `img.fundid.is` -> `fundid-item-images`
- `dev-img.fundid.is` -> `fundid-item-images-dev`

### Data retention worker

```bash
cd workers/data-retention
wrangler deploy
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
```

Runs daily at 3am UTC. Deletes resolved items after 90 days, unresolved after 6 months. Cleans up orphaned R2 images.

## Project structure

```
fundid/
├── src/
│   ├── routes/
│   │   ├── +page.svelte              # Home (map + list view)
│   │   ├── about/                    # About, FAQ, privacy
│   │   ├── item/[id]/               # Detail, resolve, flyer
│   │   ├── reply/[id]/              # Reply to contact message
│   │   └── api/
│   │       ├── health/              # Health check endpoint
│   │       └── upload/              # R2 image upload (rate limited)
│   ├── lib/
│   │   ├── components/              # Svelte components
│   │   ├── stores/                  # Svelte stores (items, filters)
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── utils/                   # Geocoding, image compression, categories
│   │   ├── i18n/                    # Translation files (is, en)
│   │   ├── supabase.ts              # Client init
│   │   └── posthog.ts               # Analytics init
│   ├── hooks.server.ts              # CSP, security headers
│   └── app.d.ts                     # Platform types (R2, KV bindings)
├── supabase/
│   ├── schema.sql                   # Base schema + PostGIS
│   ├── 002-007_*.sql                # Migrations
│   └── functions/send-email/        # Edge function (Resend)
├── workers/data-retention/          # Cloudflare Worker (cron)
├── scripts/
│   ├── load-test.sh                 # Load testing (uses hey)
│   └── posthog-dashboard.sh         # PostHog dashboard IaC
├── wrangler.toml                    # Cloudflare Pages bindings
└── .tolgeerc                        # i18n config
```

## Rate limits

All enforced server-side in Postgres RPC functions and the upload endpoint:

| Action | Limit | Window |
|--------|-------|--------|
| Contact messages per item | 10 | 24 hours |
| Contact messages per sender | 20 | 24 hours |
| Resolve attempts per item | 5 | 1 hour |
| Image uploads per IP | 10 | 1 hour |

## i18n

Translations are managed through [Tolgee](https://tolgee.io/). Files live in `src/lib/i18n/{languageTag}.json/`. Default language is Icelandic.

Pull translations:

```bash
pnpm tolgee pull
```

Push new keys:

```bash
pnpm tolgee push
```

## Analytics

PostHog (EU instance, `eu.i.posthog.com`). Cookieless with memory-only persistence. No autocapture, no session recording. Only fires when `PUBLIC_POSTHOG_KEY` is set (production).

Tracked events: page views, report form opens/submits, contact messages, item resolutions, filter changes, view toggles, language switches.

## Privacy and data retention

- Email addresses are never displayed publicly. All contact goes through the relay.
- No user accounts. No cookies. No tracking across sites.
- Items auto-delete: 90 days after resolution, 6 months if unresolved.
- Images stored on Cloudflare R2 (EU region), cleaned up with item deletion.
- Full data deletion available on request (privacy@fundid.is).

## Scripts reference

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server |
| `pnpm dev:cf` | Dev with Cloudflare R2 + KV bindings |
| `pnpm build` | Production build |
| `pnpm deploy:dev` | Build + deploy to dev |
| `pnpm deploy:prod` | Build + deploy to production |
| `pnpm check` | TypeScript type checking |
| `pnpm check:watch` | Type checking in watch mode |

## License

MIT
