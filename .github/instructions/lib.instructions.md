---
applyTo: "lib/**"
---

# Library layer (`lib/`)

Read `AGENTS.md` for backend rules. Lib-specific guidance:

- **Services own Drizzle queries** — one module per entity under `lib/services/*`.
- Schema lives in `lib/db/schema/*`; client in `lib/db/client.ts`.
- Server Actions in `app/**/*.actions.ts` call services; components and route handlers do not import Drizzle directly.
- `DATABASE_URL` is server-only. Never expose DB rows wholesale — select only fields the caller needs.
- Validate inputs with Zod at service boundaries when data comes from outside typed callers.
