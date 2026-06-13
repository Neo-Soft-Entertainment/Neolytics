# Neolytics MVP

Neolytics is a Steam-first market intelligence SaaS built with Next.js, Supabase Postgres, Prisma, Auth.js, Redis-backed background jobs, TanStack Query, and Recharts.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui-style component primitives
- Supabase Postgres
- Prisma
- Auth.js with credentials login and optional GitHub, Google, Discord, or Apple OAuth
- TanStack Query
- Recharts
- BullMQ + Redis for local Steam ingestion jobs
- Vercel Cron for Hobby-safe production refresh

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
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:[YOUR-PROJECT-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
AUTH_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
CRON_SECRET="replace-with-a-random-secret-with-at-least-16-characters"
ENCRYPTION_KEYS=""
ACTIVE_ENCRYPTION_KEY_VERSION=""
CORS_ALLOWED_ORIGINS=""
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=""
RECAPTCHA_SECRET_KEY=""
RECAPTCHA_MIN_SCORE="0.5"
STEAM_STORE_BASE_URL="https://store.steampowered.com"
STEAM_API_BASE_URL="https://api.steampowered.com"
STEAM_WEB_API_KEY=""
STEAM_DEFAULT_COUNTRY="us"
STEAM_DEFAULT_LANGUAGE="en"
STEAM_REVIEW_MULTIPLIER="45"
STEAM_REQUEST_DELAY_MS="250"
STEAM_APP_SYNC_LIMIT="500"
STEAM_CRON_BATCH_SIZE="25"
OPENAI_API_KEY=""
OPENAI_MARKET_ANALYSIS_MODEL="gpt-5.4-mini"
ENABLE_AI_MARKET_ANALYSIS="false"
ADMIN_EMAIL="admin@neolytics.local"
ADMIN_PASSWORD=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
COMPANY_DOCUMENTS_BUCKET="company-documents"
USER_AVATARS_BUCKET="user-avatars"
GOOGLE_SHEETS_CLIENT_EMAIL=""
GOOGLE_SHEETS_PRIVATE_KEY=""
GOOGLE_SHEETS_FOLDER_ID=""
```

Optional OAuth:

```env
GITHUB_ID=""
GITHUB_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
APPLE_CLIENT_ID=""
APPLE_CLIENT_SECRET=""
```

Use `APP_URL` for absolute product links such as Stripe return URLs and Discord notifications. Do not set `AUTH_URL` for normal deploys; Auth.js treats it as a fixed authentication origin, and a mismatch with the actual domain can break CSRF cookies and send users back to `/login`.

Optional reCAPTCHA v3 login protection:

- Register a reCAPTCHA v3 site in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create).
- Add the public site key to `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- Add the secret key to `RECAPTCHA_SECRET_KEY`.
- Keep `RECAPTCHA_MIN_SCORE=0.5` as the initial threshold, then tune it from real production traffic.
- The credentials login calls reCAPTCHA on submit with the `login` action and verifies the token server-side before checking the password.
- This reduces automated login abuse and credential stuffing; volumetric DDoS still needs edge protection such as Vercel firewall/rate limiting.
- Official reference: [Google reCAPTCHA v3 docs](https://developers.google.com/recaptcha/docs/v3).

Google OAuth setup:

- Create an OAuth client in Google Cloud Console
- Add an authorized redirect URI pointing to `https://your-domain/api/auth/callback/google`
- Copy the client id into `GOOGLE_CLIENT_ID`
- Copy the client secret into `GOOGLE_CLIENT_SECRET`
- Once those values are present, the login screen will automatically show `Continue with Google`

Discord OAuth setup:

- Create a Discord application in the Discord developer portal
- Add an OAuth redirect URL pointing to `https://your-domain/api/auth/callback/discord`
- Copy the client id into `DISCORD_CLIENT_ID`
- Copy the client secret into `DISCORD_CLIENT_SECRET`
- Once those values are present, the login screen will automatically show `Continue with Discord`

Apple OAuth setup:

- Create a Sign in with Apple web configuration for your domain
- Add a return URL pointing to `https://your-domain/api/auth/callback/apple`
- Copy the Apple Services ID into `APPLE_CLIENT_ID`
- Copy the generated client secret into `APPLE_CLIENT_SECRET`
- Once those values are present, the login and signup pages will automatically show `Continue with Apple`

Optional Discord webhook notifications:

- Open `Settings > Organization > Discord webhooks`
- Paste a Discord webhook URL from your server channel
- Enable notifications and send a test message
- Neolytics will post updates for invitations, reports, projects, project analysis, GDD generation, and subscription changes

Optional Google Sheets publishing:

- `SUPABASE_URL`: Supabase project URL used by the company document upload flow
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase `service_role` API key from Project Settings > API. Do not use the database password, anon key, JWT secret, or project ref.
- `COMPANY_DOCUMENTS_BUCKET`: optional private bucket name for corporate documents
- `USER_AVATARS_BUCKET`: optional public bucket name for account avatars
- `ENCRYPTION_KEYS`: comma-separated server-only encryption keys in `keyVersion:base64-32-byte-key` format. Example generation: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `ACTIVE_ENCRYPTION_KEY_VERSION`: active key version from `ENCRYPTION_KEYS`, for example `v1`
- `CORS_ALLOWED_ORIGINS`: comma-separated trusted origins for credentialed API requests in production
- `OPENAI_API_KEY`: optional OpenAI API key. It is not used by market analysis unless `ENABLE_AI_MARKET_ANALYSIS=true`
- `OPENAI_MARKET_ANALYSIS_MODEL`: optional model override for the AI marketing layer. Default: `gpt-5.4-mini`
- `ENABLE_AI_MARKET_ANALYSIS`: keep `false` to run market analysis fully from Steam data and deterministic models without token cost
- `GOOGLE_CLIENT_ID`: optional Google OAuth client id for social login
- `GOOGLE_CLIENT_SECRET`: optional Google OAuth client secret for social login
- `DISCORD_CLIENT_ID`: optional Discord OAuth client id for social login
- `DISCORD_CLIENT_SECRET`: optional Discord OAuth client secret for social login
- `APPLE_CLIENT_ID`: optional Apple Services ID for social login
- `APPLE_CLIENT_SECRET`: optional Apple client secret for social login
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: optional public reCAPTCHA v3 site key for credentials login
- `RECAPTCHA_SECRET_KEY`: optional server-side reCAPTCHA secret key for credentials login
- `RECAPTCHA_MIN_SCORE`: optional reCAPTCHA v3 threshold between `0` and `1`. Default: `0.5`
- `GOOGLE_SHEETS_CLIENT_EMAIL`: service account email
- `GOOGLE_SHEETS_PRIVATE_KEY`: service account private key
- `GOOGLE_SHEETS_FOLDER_ID`: optional Drive folder where exported spreadsheets should be placed

When the Google Sheets variables are present, export menus can push workbooks directly into Google Sheets and share them with the current signed-in user. The current integration status is also visible in `Settings > User > Google integrations`.

Security migration:

- Run `npm run security:migrate-secrets` to detect legacy plaintext OAuth tokens and Discord webhook URLs.
- Run `npm run security:migrate-secrets -- --apply` after `ENCRYPTION_KEYS` and `ACTIVE_ENCRYPTION_KEY_VERSION` are configured.
- Applied runs write encrypted rollback material under `security-backups/`; do not commit that folder.

## Installation

```bash
npm install
```

## Database setup

1. Create a Supabase project.
2. In Supabase, open `Project Settings > Database`.
3. Copy the pooled connection string into `DATABASE_URL`.
4. Copy the direct connection string into `DIRECT_URL`.
5. Keep `sslmode=require` in both URLs.
3. Generate Prisma client:

```bash
npm run db:generate
```

6. Create the first migration locally:

```bash
npm run db:migrate -- --name init
```

7. Seed the admin account, default organization, and default workspace:

```bash
npm run db:seed
```

## Running the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase notes

- Use `DATABASE_URL` with the Supabase pooler for the running app.
- Use `DIRECT_URL` for Prisma migrations and any command that needs a direct connection.
- This project uses Supabase as managed Postgres only. Auth stays in `Auth.js`, which keeps the current app structure intact.
- You do not need Firebase for this stack.
- Full setup guide: [docs/supabase-setup.md](docs/supabase-setup.md)

## Vercel Hobby deployment

- The web app works on Vercel Hobby.
- Supabase is the production database.
- `REDIS_URL` is optional in Vercel if you use the built-in cron route instead of a persistent BullMQ worker.
- The project includes `vercel.json` with one daily cron job that calls `/api/internal/steam-sync?mode=refresh`.
- Protect the cron route by setting `CRON_SECRET` in Vercel.
- `STEAM_CRON_BATCH_SIZE` should stay small on Hobby. `25` is a safe default.
- Full deployment guide: [docs/vercel-hobby-deploy.md](docs/vercel-hobby-deploy.md)

## Steam ingestion

The ingestion pipeline uses official Steam sources first.

- Primary catalog source: `ISteamApps/GetAppList/v2`
- Primary app metadata: Steam Store `appdetails`
- Primary reviews: Steam Store `appreviews`
- Primary player count: `ISteamUserStats/GetNumberOfCurrentPlayers`
- Optional fallback for the catalog: Steam Web API key via `STEAM_WEB_API_KEY`
- Last-resort fallback only: public Steam store search and a small bootstrap catalog

Neolytics does not use SteamDB as a backend source. SteamDB is useful for manual research, but it does not provide a public API for this product workflow.

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

### Run the Vercel-safe ingestion route manually

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/internal/steam-sync?mode=catalog&limit=25&offset=0"
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
- `/projects`
- `/projects/[projectId]`
- `/finance`
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
- `POST /api/finance/budgets`
- `PATCH /api/finance/budgets/[budgetId]`
- `POST /api/finance/budgets/[budgetId]/lines`
- `PATCH /api/finance/budget-lines/[lineId]`
- `POST /api/finance/revenue`
- `PATCH /api/finance/revenue/[entryId]`
- `POST /api/finance/expenses`
- `PATCH /api/finance/expenses/[entryId]`
- `GET /api/opportunities`
- `GET /api/internal/steam-sync`

Workbook export routes:

- `GET|POST /api/exports/dashboard`
- `GET|POST /api/exports/finance`
- `GET|POST /api/exports/games`
- `GET|POST /api/exports/games/[appId]`
- `GET|POST /api/exports/compare`
- `GET|POST /api/exports/opportunities`
- `GET|POST /api/exports/projects/[projectId]`
- `GET|POST /api/exports/reports/[reportId]`

Export formats:

- Excel (`xlsx`)
- CSV (`csv`)
- PDF (`pdf`) for plans with PDF export enabled

## Entitlements

Feature access is centralized in `src/lib/entitlements.ts` and the plan-to-policy mapping lives in `src/lib/subscription-plans.ts`.

- Backend code should call `assertCanUseFeature` before paid or gated operations.
- Backend code should call `assertCurrentUsageWithinLimit` before limited operations.
- Successful monthly executions are recorded as `AuditEvent` usage entries.
- Client components can use `useEntitlements`, `useUsage`, `FeatureGate`, and `LimitGate`.
- Add new product features by adding a `FeatureKey`, a `LimitKey` when needed, and one policy mapping. Do not duplicate access rules in components.

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
- The dashboard includes an optional tour that users can open when they want a quick map of the main operating areas.
