# Supabase Setup

Neolytics uses Supabase as managed PostgreSQL.

The app keeps the current backend shape:

- `Auth.js` for authentication
- `Prisma` for database access
- `Redis` for background jobs

Supabase replaces Firebase in the deployment plan because this codebase is relational and Prisma-first.

## 1. Create the project

1. Create a new project in Supabase.
2. Wait for the database to finish provisioning.

## 2. Get the database URLs

Open `Project Settings > Database`.

Copy:

- the pooled connection string into `DATABASE_URL`
- the direct connection string into `DIRECT_URL`

Recommended shape:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

Use the pooler URL for the app because it handles concurrent application traffic better.

Use the direct URL for Prisma migrations because schema changes should not go through PgBouncer.

## 3. Local environment

Set these values in `.env`:

```env
DATABASE_URL=""
DIRECT_URL=""
AUTH_SECRET=""
APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

`REDIS_URL` can stay local even if the database is hosted in Supabase.

## 4. Run Prisma

Generate the client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate -- --name init
```

Seed the app:

```bash
npm run db:seed
```

## 5. Run the app

```bash
npm run dev
```

## 6. Production notes

- Keep `DATABASE_URL` and `DIRECT_URL` in the deployment platform secrets.
- Keep `AUTH_SECRET` private and rotate it if leaked.
- Restrict Supabase database access to trusted environments.
- If you later move auth into Supabase Auth, treat that as a separate migration. Do not mix that change into the database move unless there is a concrete reason.
