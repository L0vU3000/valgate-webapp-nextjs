---
applyTo: "drizzle/**,lib/db/**"
---

# Database and migrations

Read `AGENTS.md` → Backend (Neon + Drizzle).

- Migrations in `drizzle/` are **hand-authored** — do not run `drizzle-kit generate` casually.
- Workflow: `npm run db:generate` (create) → review SQL → `npm run db:migrate` (apply). Ping with `npm run db:ping` when `DATABASE_URL` is available.
- Schema changes belong in `lib/db/schema/*`; access data through `lib/services/*`.
- Never commit `.env*` except `.env.example`.
