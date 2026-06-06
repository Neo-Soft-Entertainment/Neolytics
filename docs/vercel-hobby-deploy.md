# Vercel Hobby Deploy

This project can run on Vercel Hobby with Supabase.

The right deployment shape is:

- Vercel Hobby for the Next.js app
- Supabase Postgres for the database
- Vercel Cron for one daily refresh batch
- Optional Redis only for local BullMQ jobs

## Important limitation

Vercel's official documentation says Hobby is for personal Git integrations, and Hobby cannot connect a GitHub organization repository directly.

This repository lives under:

- `Neo-Soft-Entertainment/Neolytics`

That means the safest Hobby workflow is usually one of these:

1. Deploy with the Vercel CLI from your local machine
2. Mirror or fork the repository to a personal GitHub account and connect that repo to Vercel Hobby

If you want automatic Git-based deploys from this organization repository, you will likely need Vercel Pro.

## Required Vercel environment variables

Set these in the Vercel project:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_URL=
CRON_SECRET=
STEAM_STORE_BASE_URL=https://store.steampowered.com
STEAM_API_BASE_URL=https://api.steampowered.com
STEAM_DEFAULT_COUNTRY=us
STEAM_DEFAULT_LANGUAGE=en
STEAM_REVIEW_MULTIPLIER=45
STEAM_REQUEST_DELAY_MS=250
STEAM_APP_SYNC_LIMIT=500
STEAM_CRON_BATCH_SIZE=25
ADMIN_EMAIL=admin@neolytics.local
ADMIN_PASSWORD=ChangeMe123!
```

Recommended values:

- `AUTH_URL=https://your-project-name.vercel.app`
- `CRON_SECRET` should be random and long
- `STEAM_CRON_BATCH_SIZE=25` for Hobby

`REDIS_URL` is optional in Vercel if you are not running BullMQ there.

## Why the cron route exists

Persistent workers do not fit Vercel Hobby well.

Because of that, this repo includes:

- `vercel.json`
- `GET /api/internal/steam-sync`

The cron route:

- checks the `Authorization` header against `CRON_SECRET`
- refreshes a small batch of existing games
- falls back to catalog seeding if the database is still empty

## Hobby-safe ingestion pattern

On Vercel Hobby, keep production ingestion simple:

1. Seed the first batch manually
2. Let the daily cron refresh existing games

### Manual first seed

Call this endpoint with your secret:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-project-name.vercel.app/api/internal/steam-sync?mode=catalog&limit=25&offset=0"
```

Then repeat with the next offset when needed:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-project-name.vercel.app/api/internal/steam-sync?mode=catalog&limit=25&offset=25"
```

### Daily refresh

`vercel.json` schedules:

- `/api/internal/steam-sync?mode=refresh`

once per day.

That keeps already-known games fresh without requiring a long-running worker.

## Deployment steps

### Option 1: Vercel CLI

1. Install Vercel CLI
2. Run:

```bash
vercel
```

3. Add all environment variables in the Vercel dashboard
4. Run production deploy:

```bash
vercel --prod
```

### Option 2: Personal Git mirror

1. Fork or mirror this repository into your personal GitHub account
2. Connect that personal repository to Vercel Hobby
3. Add the environment variables
4. Deploy

## Database migrations

Run Prisma migrations against Supabase from your local machine:

```bash
npm run db:migrate -- --name init
```

For later deploys:

```bash
npm run db:deploy
```

## Seed

Run:

```bash
npm run db:seed
```

This creates the initial admin account, organization, and workspace.
