# Architecture Overview

Valgate follows a strict **layered architecture** that separates concerns between transport (routes/actions), business logic (services), and data (Drizzle/Neon). The core principle is that every request enters through a single auth boundary, flows through thin server actions, delegates to service-layer business logic, and touches the database through a single Drizzle client.

## Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js App Router                                  │
│  (shell)/page.tsx  ·  (shell)/property/[id]/*  ·    │
│  (auth)/login  ·  api/add-property/scan  ·  ...     │
├─────────────────────────────────────────────────────┤
│  Server Actions  (app/actions/*.ts)                  │
│  Thin transport: validate input → requireCtx() →   │
│  delegate to service → revalidate path → return     │
├─────────────────────────────────────────────────────┤
│  Service Layer  (lib/services/*.ts)                 │
│  Business logic: CRUD, ingestion, AI extraction,    │
│  cross-org access, change requests, storage         │
├─────────────────────────────────────────────────────┤
│  Database  (lib/db/client.ts → Drizzle + Neon)      │
│  Single db export, schema barrel in schema/index.ts │
└─────────────────────────────────────────────────────┘
```

### Server Actions (Transport Layer)

Server actions in `/app/actions/` are thin wrappers. Each action:

1. Validates input with Zod
2. Calls `requireCtx()` for authenticated context
3. Delegates to the corresponding service function
4. Calls `revalidatePath()` to bust Next.js cache
5. Returns an `ActionResult` (success/error envelope defined in `/app/actions/_result.ts`)

Actions never contain business logic — they are pure transport. See `/app/actions/properties.ts`, `/app/actions/property-drafts.ts`, `/app/actions/unified-extract.ts` for representative examples.

### Service Layer

Services in `/lib/services/` own all business logic. They accept a `Ctx` object (not Clerk's auth) so they are transport-pure and testable. Key patterns:

- **`Ctx` type** (`/lib/services/_mapping.ts`): `{ userId, orgId, orgRole }` — the authenticated context passed to every service function
- **`_crud.ts`**: Generic org-scoped CRUD helpers
- **`_mapping.ts`**: Type conversion utilities, `assertCanMutate()` demo-write guard
- Entity-specific services (e.g., `properties.ts`, `tenants.ts`, `leases.ts`) implement create/read/update/delete with org-scoping and Zod validation

### Database Layer

- **`/lib/db/client.ts`**: Single `db` export using `@neondatabase/serverless` with a WebSocket pool. Marked `"server-only"`.
- **`/lib/db/schema/index.ts`**: Barrel re-export of 15 schema modules consumed by the Drizzle client and drizzle-kit.
- **`/lib/db/column-classifier.ts`**: Central type-conversion utility — converts between DB rows (Date, numeric strings) and domain objects (epoch ms, Numbers).

## Auth Context

### `requireCtx()` — The Single Auth Boundary

**Source:** `/lib/auth/ctx.ts`

Every server action and server component calls `requireCtx()` (memoized with React's `cache()` per request). This is the **only** caller of Clerk's `auth()`. It:

1. Returns `DEMO_CTX` if `DEMO_MODE=true` (refused in production or when a real Clerk key is set)
2. Calls Clerk `auth()` for `userId`, `orgId`, `orgRole`
3. JIT-syncs missing user/org mirror rows to the database (webhooks are the steady-state writer)
4. Resolves Clerk IDs to internal IDs (`ORG-0001`, `USR-0001`) via `identity-sync.ts`
5. Returns a `Ctx` object: `{ userId, orgId, orgRole }`

### Role Gating

- **`requireRole(ctx, minRole)`** — Edge-level role gate in `/lib/auth/ctx.ts`. Ranks: `viewer < member < admin < owner`.
- **`assertCanMutate(ctx)`** — Demo-write guard in `/lib/services/_mapping.ts`. Prevents writes in DEMO_MODE unless `DEMO_ALLOW_WRITES=true`.

### Cross-Org Access

**Source:** `/lib/auth/cross-org.ts`

Managers can access client owner orgs via `?orgId=` query param. `resolveCrossOrgCtx(orgId)` returns `{ ctx, isCrossOrg }` — either a cross-org context or the caller's own context. Used by property detail pages.

### MCP Context

**Source:** `/lib/auth/mcp-ctx.ts`

Separate context resolver for the `/mcp` endpoint. Uses Clerk OAuth tokens (not session cookies) and applies MCP-specific client ID allowlisting.

## Middleware

**Source:** `/middleware.ts`

Clerk middleware with DEMO_MODE awareness:

- **Public routes**: `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/oauth-consent`, `/contact`, webhooks, `/mcp`, `/.well-known/*`, `/docs`
- **Protected routes**: everything else calls `auth.protect()` → redirects to `/login`
- **Signed-in redirect**: users hitting `/login` or `/register` (without an invite ticket) are sent to `/launch`
- **MCP rate limiting**: 200 req/min/IP for `/mcp` and `/.well-known/*` routes
- **DEMO_MODE**: skips Clerk entirely when `CLERK_SECRET_KEY` is the placeholder

## Environment Configuration

**Source:** `/lib/env.ts`

All environment variables are validated through `@t3-oss/env-nextjs` with Zod schemas. The boundary is split:

- **Server vars**: `DATABASE_URL`, Clerk keys, S3, Upstash, OpenAI, Resend, MCP OAuth config, `CRON_SECRET`
- **Client vars**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`

Optional vars use `.optional()` with fail-closed defaults — an unset secret means "locked, never open."

## Caching

- Server components in `/app/(shell)/` use `export const dynamic = "force-dynamic"` (always reads from DB)
- Portfolio queries use `unstable_cache` for cached reads
- `revalidatePath()` is called after mutations in server actions

## Logging

- `/lib/log.ts` — structured logger (used by services)
- `/lib/logger.ts` — additional logging utility
