# Valgate — Agent Instructions

> **Read this file first** when working in this repository.  
> Human-oriented quick reference: [`CLAUDE.md`](./CLAUDE.md) · Cursor workspace rules: [`.cursor/README.md`](./.cursor/README.md) · Architecture: [`docs/nextjs-architecture.md`](./docs/nextjs-architecture.md)

---

## What this project is

**Valgate** is a multi-tenant **property portfolio management** web app (portfolio map, property detail, rentals, documents, estate planning, add-property flow). The frontend is **Next.js 15** (App Router, React 19). The **target backend is Neon PostgreSQL** (with **PostGIS** for boundaries/parcels where needed).

---

## Critical: `convex/` is legacy — ignore it

The `convex/` directory is **leftover from an old codebase**. It is **not** the source of truth and **must not** be extended.

| Do | Don't |
|---|---|
| Treat [`docs/database/prototype/schema.sql`](./docs/database/prototype/schema.sql) as the **schema direction** (while it is being refined) | Use `convex/schema/*` as the canonical model |
| Plan new persistence for **Neon / Postgres** | Add Convex queries, mutations, actions, or `useQuery` / `useMutation` |
| Wire features via **Server Components**, **Server Actions**, and a future `lib/db` layer | Import from `convex/_generated/*` or add `ConvexProvider` |
| Leave `convex/` untouched unless explicitly asked to delete or migrate a specific file | Run `npx convex dev` or `npx convex ai-files install` for new work |

If user rules or older docs mention Convex, **those are stale** — follow this file instead.

---

## Authoritative documentation

| Topic | Location |
|---|---|
| **Identity (Clerk orgs, memberships)** | [`docs/database/identity.md`](./docs/database/identity.md) |
| **Database prototype (DDL, enums, tables)** | [`docs/database/prototype/schema.sql`](./docs/database/prototype/schema.sql) |
| **Database testing** | [`docs/database/testing.md`](./docs/database/testing.md) · `npm run db:test` |
| Next.js patterns (RSC, actions, caching) | [`docs/nextjs-architecture.md`](./docs/nextjs-architecture.md) |
| UI / page chrome / tokens | [`docs/design-language.md`](./docs/design-language.md) |
| Mock → real data swap pattern | [`docs/mock-to-backend-pattern.md`](./docs/mock-to-backend-pattern.md) |
| Add Property wizard | [`docs/add-property-flow-spec.md`](./docs/add-property-flow-spec.md) |
| Mapbox (client + future server geocoding) | [`docs/mapbox-backend-guide.md`](./docs/mapbox-backend-guide.md) |

There is **no** `ref/` folder or `lib/data/types/*.ts` in this tree yet — do not assume they exist.

---

## Stack (current target)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, Turbopack |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) |
| Auth | Clerk (users + organizations) |
| **Database** | **Neon PostgreSQL** (+ PostGIS for geo) |
| Validation | Zod |
| Forms | React Hook Form + Zod |
| Object storage | AWS S3 (presigned uploads, private bucket) |
| Maps | Mapbox GL |
| Email / payments / rate limits | Resend, Stripe, Upstash Redis (when wired) |
| Env validation | `@t3-oss/env-nextjs` (expand as vars are added) |

ORM/query layer (Drizzle, Prisma, etc.) is **not finalized** — do not introduce one without an explicit decision; prefer SQL aligned with `schema.sql` and a thin `lib/db` module when added.

---

## Repository layout (what matters)

```
app/
  (shell)/          # Main app: portfolio, property/[id]/*, add-property, settings, …
  (auth)/           # Auth pages
  layout.tsx
components/         # UI, layout, map, portfolio, …
lib/
  data/             # Types + mock accessors (swap point for Neon)
  mock-data.ts      # Minimal portfolio mock (transitional)
  hooks/            # Client hooks; mock today, DB-backed later
  services/         # Server-side integrations (e.g. S3)
docs/
  database/prototype/schema.sql   # Postgres DDL prototype
convex/             # ⚠️ LEGACY — do not use for new work
imports/            # Figma export artifacts — not production routes
```

**Production UI** lives under `app/` and `components/`. **`imports/`** is design handoff, not the app shell.

---

## Data & tenancy model (target)

- **Multi-tenant by organization** (Clerk org → rows scoped by `org_id` in Postgres). The prototype still uses `user_id` in places; **new design should prefer `org_id`** and membership checks.
- **IDs**: prototype uses `TEXT` demo IDs (`PROP-0001`); production should use **UUID** (or ULID) in Postgres.
- **Timestamps**: prefer **`TIMESTAMPTZ`** in Postgres (prototype uses `BIGINT` ms in places — normalize when migrating).
- **Money / area / counts**: **`NUMERIC`** / **`INT`**, not `TEXT` (see anomaly comments `A1`, `A2` in `schema.sql`).

---

## Current implementation phase

1. **UI** — largely built; many routes read **mock data** via `lib/data/*` → `lib/mock-data.ts`.
2. **Database** — prototype DDL in `docs/database/prototype/schema.sql` (under review; gaps vs product are expected).
3. **Neon** — not fully wired in app code yet; `lib/db.ts` / migrations may be added incrementally.
4. **Auth** — Clerk in dependencies; middleware may still be permissive — always enforce auth + **org/resource ownership** in server code that touches data.

When implementing a feature: **keep components pure**, change **`lib/data/*`**, **Server Actions**, or **`services/`** — not inline mocks in pages.

---

## Data flow (target)

```
Browser (Client Component, UI only)
    ↓ events / forms
Server Action or Server Component
    ↓ Zod validate → Clerk session → org authorize
lib/db / services → Neon Postgres (+ S3 for files)
    ↓
revalidatePath / revalidateTag
    ↓
Server Component re-fetch → props to client
```

- **Default to Server Components** for reads; `"use client"` only at leaves (state, DnD, Mapbox, etc.).
- **No `useEffect` for initial page data** — fetch in the Server Component.
- **Always `await params`** (and `searchParams` when used) — they are Promises in Next.js 15.
- **One actions file per domain** (e.g. `app/(shell)/add-property/actions.ts`, or top-level `actions/` when introduced).

---

## Uploads & documents

- **Do not** add Next.js route handlers for presign/upload orchestration (`/api/uploads/*`, `/api/presign/*`).
- **Do** implement presign + upload metadata in **Server Actions** or **`lib/services/`**, with:
  - Clerk auth + org membership + property access checks
  - Short-lived presigned POST/PUT, MIME allowlist, size caps
  - Private S3 keys (e.g. `org/{orgId}/…`)
- **Webhooks only** under `app/api/webhooks/*` (Stripe, Clerk, …): verify signature, delegate to server logic.

---

## Security (non-negotiable)

**Client → server**

- Zod-validate every mutation input.
- Authenticate **and** authorize (resource belongs to user's org) — prevent IDOR.
- Rate-limit auth and sensitive actions (Upstash when configured).
- Never return raw `err.message` to the client; log server-side, return generic messages.

**Server → client**

- Select only fields the UI needs — never pass full DB rows or secrets as props.
- No secrets in `NEXT_PUBLIC_*`.

---

## Anti-patterns

| Avoid | Prefer |
|---|---|
| Reading or extending `convex/` | `docs/database/prototype/schema.sql` + Neon access layer |
| Convex hooks in client components | Server Actions + RSC refetch |
| Mock data inlined in `page.tsx` | `lib/data/[feature].ts` |
| `"use client"` on layout/page shells | Server page + small client children |
| Business logic in route handlers | `actions/` + `services/` |
| Raw `FormData` to SQL | Zod parse first |
| God-table `properties` in new DDL | Normalized tables per domain (location, finance, owners, …) |
| Trusting `orgId` / `propertyId` from the client without server check | Resolve from session + DB |

---

## shadcn/ui

Add components with:

```bash
npx shadcn@latest add {componentName}
```

Do not hand-copy shadcn primitives into `components/ui/`.

---

## Commits & PRs

- **Do not commit** unless the user asks.
- Use **Conventional Commits** when committing.
- Keep diffs minimal and scoped to the task.

---

## When unsure

1. Check whether the feature is still on **mock data** (`lib/data/*`, `lib/mock-data.ts`).
2. Align schema changes with **`docs/database/prototype/schema.sql`** (or propose updates there first).
3. Prefer **Server Component + Server Action + Postgres** — never Convex for new persistence.
