# Backend (Neon + Drizzle)

This project uses **Neon (serverless Postgres)** with **Drizzle ORM** as its backend.

- Schema lives in `lib/db/schema/*`; the DB client is `lib/db/client.ts`.
- Data access goes through `lib/services/*` (one module per entity), called from Server Actions in `app/**/*.actions.ts`. Never query the DB directly from a component or route handler.
- Migrations: `npm run db:generate` → `npm run db:migrate`; check connection with `npm run db:ping`.
- Seeding: `npm run seed:neon`. **Never run `seed:reset`** — it destroys the evolved seed data.
- `DATABASE_URL` (Neon branch) is a server-only secret — never `NEXT_PUBLIC_`.

> The `convex/` directory is a legacy/parallel layer the app does **not** call. Do not add
> new backend code there or follow Convex patterns — use Neon + Drizzle services.
