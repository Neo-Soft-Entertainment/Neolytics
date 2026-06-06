# Neolytics MVP

Neolytics is a Steam-first market intelligence SaaS built with Next.js, PostgreSQL, Prisma, Auth.js, Redis-backed background jobs, TanStack Query, and Recharts.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui-style component primitives
- PostgreSQL
- Prisma
- Auth.js with credentials login and optional GitHub OAuth
- TanStack Query
- Recharts
- BullMQ + Redis for Steam ingestion jobs

## Folder structure

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    (app)/
    (auth)/
    api/
  components/
    app-shell/
    auth/
    charts/
    compare/
    dashboard/
    games/
    opportunities/
    reports/
    settings/
    ui/
  features/
    dashboard/
    games/
    opportunities/
    reports/
  jobs/
    steam/
  lib/
    steam/
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neolytics?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
STEAM_STORE_BASE_URL="https://store.steampowered.com"
STEAM_API_BASE_URL="https://api.steampowered.com"
STEAM_DEFAULT_COUNTRY="us"
STEAM_DEFAULT_LANGUAGE="en"
STEAM_REVIEW_MULTIPLIER="45"
STEAM_REQUEST_DELAY_MS="250"
STEAM_APP_SYNC_LIMIT="500"
ADMIN_EMAIL="admin@neolytics.local"
ADMIN_PASSWORD="ChangeMe123!"
```

Optional OAuth:

```env
GITHUB_ID=""
GITHUB_SECRET=""
```

## Installation

```bash
npm install
```

## Database setup

1. Create a PostgreSQL database.
2. Set `DATABASE_URL`.
3. Generate Prisma client:

```bash
npm run db:generate
```

4. Create the first migration locally:

```bash
npm run db:migrate -- --name init
```

5. Seed the admin account, default organization, and default workspace:

```bash
npm run db:seed
```

## Running the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Steam ingestion

The ingestion pipeline uses only public Steam endpoints.

### Enqueue jobs into Redis

```bash
npm run jobs:steam:enqueue -- --limit=250
```

### Run the BullMQ worker

```bash
npm run jobs:steam:worker
```

### Run a direct one-process sync

```bash
npm run jobs:steam:once
```

## What the ingestion pipeline does

- Fetches the Steam app list
- Pulls public store metadata per app
- Pulls public review summary data per app
- Pulls public current player count per app
- Scrapes public store tags when available
- Upserts normalized current records
- Writes historical snapshots
- Calculates explainable sales and revenue estimates
- Logs ingestion runs and failures
- Skips invalid or unsupported apps

## Implemented pages

- `/dashboard`
- `/games`
- `/games/[appId]`
- `/compare`
- `/opportunities`
- `/reports`
- `/settings`
- `/login`

## Implemented API routes

- `GET /api/games/search`
- `GET /api/games/[appId]`
- `GET /api/games/[appId]/snapshots`
- `GET /api/games/[appId]/price-history`
- `GET /api/games/[appId]/review-history`
- `GET /api/games/[appId]/player-history`
- `GET /api/games/[appId]/estimates`
- `GET /api/compare`
- `POST /api/workspaces/saved-games`
- `POST /api/competitor-sets`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/dashboard`
- `GET /api/opportunities`

## Estimation model

Sales estimate:

```text
estimated_sales = review_count
                × base_review_multiplier
                × genre_adjustment
                × price_tier_adjustment
                × age_adjustment
```

Revenue estimate:

```text
gross_revenue = estimated_sales × average_price
net_revenue = gross_revenue × 0.70
```

Each estimate stores:

- low
- median
- high
- confidence
- explanation

## Notes

- Billing is intentionally not implemented yet.
- AI reports are stored behind a real service and report model, but generation is deterministic for MVP.
- The dashboard uses live database data only. If the database is empty, the UI will show empty states instead of fake metrics.
