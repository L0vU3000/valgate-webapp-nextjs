# Valgate — Codebase Rules (Claude / AI)

> Property portfolio app on **Next.js 15**. Backend target: **Neon PostgreSQL** (not Convex).  
> Agent workflow: [`AGENTS.md`](./AGENTS.md) · Cursor rules: [`.cursor/README.md`](./.cursor/README.md) · Architecture: [`docs/nextjs-architecture.md`](./docs/nextjs-architecture.md)

---

## Legacy backend: do not use Convex

The **`convex/` folder is deprecated**. Persistence is moving to **Neon Postgres**. For schema and table design, use **[`docs/database/prototype/schema.sql`](./docs/database/prototype/schema.sql)** (prototype under active review).

**Do not** for new work:

- Add or modify Convex functions, schema, or HTTP routes in `convex/`
- Use `useQuery` / `useMutation` / `ConvexProvider` / `convex/_generated/api`
- Treat Convex docs or `convex/_generated/ai/guidelines.md` as authoritative

---

## Stack

| Concern | Library |
|---|---|
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | Clerk (users + orgs) |
| **Database** | **Neon PostgreSQL** (+ PostGIS for geo) |
| Validation | Zod |
| Forms | React Hook Form + Zod |
| Files | AWS S3 (presigned, server-side orchestration) |
| Maps | Mapbox GL |
| Email / payments / rate limits | Resend, Stripe, Upstash Redis (as wired) |
| Env validation | `@t3-oss/env-nextjs` |

---

## Core rules

- **Default to Server Components.** Add `"use client"` only at the leaf when needed (interactivity, Mapbox, DnD, etc.).
- **Fetch in Server Components** — never `useEffect` for initial data loads.
- **Persist via Server Actions + Postgres** (through `lib/db` / `services/` when present) — not Convex.
- **One action file per domain** — e.g. `add-property/actions.ts`, `property.actions.ts`.
- **Always `await params`** (and `searchParams`) — Promises in Next.js 15.
- **Mock data** lives in `lib/data/*` and `lib/mock-data.ts` until Neon is wired; swap at the data layer per [`docs/mock-to-backend-pattern.md`](./docs/mock-to-backend-pattern.md).

---

## Data flow

```
Client Component → Server Action → Neon (via lib/db / services)
                                        ↓
                              revalidatePath / revalidateTag
                                        ↓
Client Component ← Server Component re-fetches fresh data
```

Reads: **async Server Components** → `lib/data/*` (mock today) or SQL (target).  
Writes: **Server Actions** → Zod → authz → SQL / S3.

---

## Database

| Item | Location |
|---|---|
| DDL prototype | [`docs/database/prototype/schema.sql`](./docs/database/prototype/schema.sql) |
| Live app data (transitional) | [`lib/mock-data.ts`](./lib/mock-data.ts), [`lib/data/`](./lib/data/) |
| Legacy (ignore) | `convex/` |

When changing the data model: update the **SQL prototype** and types in **`lib/data/`** together; prefer **org-scoped** tables and **UUID** keys over demo `TEXT` IDs.

---

## Security

**Client → server**

- Validate every input with Zod before SQL or storage.
- Authenticate (Clerk) **and** authorize (org owns the resource) on every mutation.
- Never return `err.message` to the client — log internally, return generic strings.
- Rate-limit login, signup, and sensitive actions.

**Server → client**

- Never send full DB rows as props — select only what the UI renders.
- Never pass secrets to Client Components.
- Never prefix secrets with `NEXT_PUBLIC_`.

---

## Uploads

- **No** `/api/uploads/*` or `/api/presign/*` route handlers for orchestration.
- Presign and document pipeline logic in **Server Actions** / **`lib/services/`**, with Clerk + org checks.
- **Only** `app/api/webhooks/*` for external callbacks (verify signatures, then server logic).

---

## UI

- Follow [`docs/design-language.md`](./docs/design-language.md) for page structure and tokens.
- Add shadcn components: `npx shadcn@latest add {componentName}` — do not hand-roll primitives.

---

## Anti-patterns

| ❌ Anti-pattern | ✅ Fix |
|---|---|
| Using or extending `convex/` | Neon + `schema.sql` + Server Actions |
| Convex for DB reads/writes | Server Component / Server Action + Postgres |
| `"use client"` on every file | Server by default; client at leaves |
| `useEffect` for initial data | Fetch in Server Component |
| Secrets in `NEXT_PUBLIC_*` | Server-only env vars |
| Business logic in route handlers | `actions/` + `services/` |
| No `loading.tsx` on heavy routes | Route-level skeletons |
| Sync `params` | `await params` |
| Raw `FormData` to DB | Zod first |
| Auth without ownership / org check | Verify resource ∈ user's org |
| `err.message` to client | Generic error + server log |
| Full DB object as props | Select UI fields only |
| Inline mocks in pages | `lib/data/[feature].ts` |

---

## Key docs

- [`AGENTS.md`](./AGENTS.md) — agent playbook (legacy Convex rule, repo map, phase)
- [`docs/nextjs-architecture.md`](./docs/nextjs-architecture.md) — App Router patterns
- [`docs/design-language.md`](./docs/design-language.md) — UI conventions
- [`docs/add-property-flow-spec.md`](./docs/add-property-flow-spec.md) — Add Property wizard
- [`docs/mock-to-backend-pattern.md`](./docs/mock-to-backend-pattern.md) — swapping mocks for Neon

---

## Product context (routes)

Main shell under `app/(shell)/`: home/portfolio, `property/[id]/*`, `add-property`, rental, estate-planning, directory, profile, settings. Auth under `app/(auth)/`. **`imports/`** is Figma output — not production routing.
