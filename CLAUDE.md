# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Neolytics is a **Steam-first market intelligence SaaS platform** for indie game developers and publishers — analyze game market data, track competitors, manage finances, and generate AI-powered market reports.

**Stack**: Next.js 15 (App Router) · React 19 · TypeScript · Prisma 5 · Supabase PostgreSQL · Auth.js v5 · BullMQ · Redis · Tailwind CSS · shadcn/ui

---

## Common Commands

```bash
# Development
npm run dev               # Next.js dev server
npm run build             # Production build
npm run lint              # ESLint

# Database
npm run db:generate       # Prisma generate (after schema changes)
npm run db:migrate        # Create + apply migration locally
npm run db:deploy         # Apply migrations to production (direct URL)
npm run db:seed           # Seed reference data

# Steam ingestion jobs
npm run jobs:steam:enqueue -- --limit=250   # Queue sync jobs
npm run jobs:steam:worker                   # Process job queue
npm run jobs:steam:once                     # Single-run sync (no Redis)

# Initial setup
docker-compose up -d      # Local Postgres + Redis
cp .env.example .env.local
npm run db:generate && npm run db:migrate -- --name init && npm run db:seed
```

---

## Project Structure

```
src/
  app/
    (app)/        # Authenticated routes — dashboard, games, finance, projects, community, company
    (auth)/       # Login, signup, password reset
    api/          # RESTful API routes (Next.js Route Handlers)
  components/     # React components, organized by feature
  features/       # Custom React hooks per feature area
  lib/            # Shared services, utilities, business logic
  jobs/steam/     # BullMQ workers for Steam data ingestion
  types/          # Global TypeScript types
prisma/           # schema.prisma + migrations
scripts/          # Dev and security scripts
docs/             # Deployment guides (supabase-setup.md, vercel-hobby-deploy.md)
```

---

## Architecture Patterns

### Authentication — `src/auth.ts`, `src/lib/auth-helpers.ts`

Auth.js v5 with Credentials + OAuth (GitHub, Google, Discord, Apple). JWT sessions (30-day). reCAPTCHA v3 on login. Rate limiting: 5 failed attempts → 15-min lockout. Custom Prisma adapter in `src/lib/auth-adapter.ts`.

### Multi-tenancy — `src/lib/active-organization.ts`, `src/lib/active-workspace.ts`

Hierarchy: **User → OrganizationMember → Organization → Workspace**. Active org/workspace stored in `orgId` / `wsId` cookies, validated on every request. Missing or invalid membership returns 404.

### Feature Entitlements — `src/lib/entitlements.ts`, `src/lib/subscription-plans.ts`

Plans: `FREE | PLUS | PRO`. Gate features with `await assertCanUseFeature(context, "featureKey")`. Plan-to-feature mapping is defined in `subscription-plans.ts`.

### API Design — `src/lib/api-helpers.ts`

All route handlers use standardized response helpers: `ok(data)` → 200, `created(data)` → 201, `badRequest(msg)` → 400, `unauthorized()` → 401, `forbidden()` → 403, `notFound()` → 404, `tooManyRequests()` → 429, `serverError(msg)` → 500. Validate request bodies with Zod before processing.

### Database — `prisma/schema.prisma`

Two Supabase connection strings are required:
- `DATABASE_URL` — pooled connection (port **6543**) for app queries
- `DIRECT_URL` — direct connection (port **5432**) for Prisma migrations

Key model groups: Auth (`User`, `Account`, `Session`), Org/workspace (`Organization`, `OrganizationMember`, `Workspace`), Steam (`SteamApp`, `SteamAppSnapshot`, `SteamReview`), Finance (`Budget`, `Revenue`, `Expense`), Projects (`Project`, `ProjectMilestone`, `AiReport`), Company (`LegalEntity`, `CompanyDocument`), Community (`CommunityPost`, `CommunityPostLike`).

### Steam Ingestion — `src/jobs/steam/`

Data pulled in priority order: app catalog via `ISteamApps/GetAppList/v2` → metadata via Store `appdetails` → reviews via Store `appreviews` → player counts via `ISteamUserStats/GetNumberOfCurrentPlayers`. Default request delay: 250 ms (`STEAM_REQUEST_DELAY_MS`). Production: Vercel cron at `0 5 * * *` UTC.

### Estimation Model — `src/lib/steam-estimation.ts`

```
estimated_sales  = review_count × base_multiplier × genre_adj × price_adj × age_adj
gross_revenue    = estimated_sales × average_price
net_revenue      = gross_revenue × 0.70   (Steam 30% cut)
```

Multiplier tunable via `STEAM_REVIEW_MULTIPLIER` env var.

### Component / Data Fetching Pattern

Pages are **server components**; data-heavy UI delegates to client components with **TanStack Query** hooks (in `src/features/`). Forms use React Hook Form + Zod schemas.

### Security Headers — `next.config.ts`

CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CORS validation. reCAPTCHA v3 domains are whitelisted in the CSP.

### Exports — `src/lib/export-service.ts`, `src/app/api/exports/`

Supports `.xlsx` (ExcelJS), `.csv`, and `.pdf` output for financial and market data.

---

## Environment Variables

**Required:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooled connection (port 6543) |
| `DIRECT_URL` | Supabase direct connection (port 5432, migrations only) |
| `AUTH_SECRET` | JWT signing secret (32+ chars) |
| `APP_URL` | Application origin URL |
| `CRON_SECRET` | Vercel cron authentication (16+ chars) |

**Optional (common):** `STEAM_WEB_API_KEY`, `STEAM_REVIEW_MULTIPLIER`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, OAuth credentials (GitHub/Google/Discord/Apple), Stripe keys + price IDs, Google Sheets API keys, `REDIS_URL`.

---

## Deployment

- **Platform**: Vercel — auto-deploys on push to `main`
- **Cron**: `vercel.json` defines daily Steam sync at `0 5 * * *` UTC
- **Migrations in production**: `npm run db:deploy` (uses `DIRECT_URL`)
- Detailed guides: `docs/supabase-setup.md`, `docs/vercel-hobby-deploy.md`

---

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Do not include `Co-Authored-By` trailers in commit messages. See `AGENTS.md` for details.
