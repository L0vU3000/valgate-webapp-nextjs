# Valgate Products — Consumer vs Professional

This document defines how the two Valgate product surfaces are organized in the codebase.

---

## Overview

| Product | Audience | Purpose |
|---------|----------|---------|
| **Valgate Consumer** | Property owners | Manage a personal property portfolio |
| **Valgate Professional** | Asset / property managers | Oversee multiple client portfolios from one control plane |

Professional does not duplicate the consumer data model. It aggregates and operates across many consumer-style portfolios (client orgs).

---

## Frontend boundaries

```
app/
  (auth)/          ← shared login / signup
  (shell)/         ← Consumer (owner app)
  (pro)/
    layout.tsx     ← Pro route-group guard (dev-only until auth ships)
    pro/           ← URL prefix /pro/*
      layout.tsx   ← ManagerProShell (Pro chrome)
      dashboard/   → /pro/dashboard
      clients/     → /pro/clients/[clientId]
```

### Consumer — `app/(shell)/`

- **Shell:** [`ShellLayout`](../components/layout/ShellLayout.tsx) + consumer `Sidebar`
- **Routes:** `/portfolio`, `/property/[id]/...`, `/analytics`, etc.
- **Future rename:** `(shell)` → `(consumer)` when convenient — not required today

### Professional — `app/(pro)/pro/`

- **Shell:** `ManagerProShell` + `ProAppHeader` + `ManagerSidebar`
- **Routes:** `/pro/dashboard`, `/pro/clients/[clientId]`
- **URLs:** `/manager/*` redirects to `/pro/*` (temporary, see [`next.config.ts`](../next.config.ts))
- **Production:** `(pro)/layout.tsx` returns 404 until Clerk org-role auth replaces the `NODE_ENV` guard

### Shared frontend

- **Design system:** [`components/ui/`](../components/ui/), [`styles/theme.css`](../styles/theme.css)
- **Helpers:** `lib/property-helpers.ts`, `lib/utils.ts`, etc.
- **Auth entry:** `app/(auth)/` — one Clerk app for both products (for now)

### Component extraction rule

Keep Pro widgets colocated under `app/(pro)/pro/` until the same component appears in both products **three times**. Then extract to `components/domain/`.

---

## Backend boundaries

The backend is **Neon (serverless Postgres) + Drizzle ORM**. Schema lives in `lib/db/schema/*`, the DB client in `lib/db/client.ts`, and data access in `lib/services/*` (one module per entity) called from Server Actions in `app/**/*.actions.ts`. (A legacy `convex/` directory still exists in the repo but the app does **not** call it.)

### Shared schema — `lib/db/schema/`

Property, lease, documents, and identity tables are shared. Professional reads the same entities consumer writes.

Key identity primitives (`lib/db/schema/identity.ts`):

- `orgs` — Clerk organizations
- `users` — Clerk users
- `org_members` — membership + roles for access control

### Pro-only access

```
lib/services/
  pro/             ← aggregate reads + Pro-only writes (invites, assignments, etc.)
app/(pro)/pro/
  queries.ts       ← page queries (aggregate reads across managed client orgs)
  actions.ts       ← Pro Server Actions (Zod-validated, auth-scoped writes)
```

Pro queries/actions enforce **"manager org member can access client org X"** by scoping every Drizzle query to the authed user/org (Clerk `auth()`), since Neon has no built-in RLS layer wired here.

**Do not fork the schema.** Pro never gets duplicate property tables.

---

## Data model (conceptual)

```
Manager Org (Pro user belongs here)
  └── manages → Client Org A, Client Org B, ...
                    └── each has → properties, leases, documents (consumer schema)
```

Exact "client" linkage (Clerk org vs portfolio link table) is TBD — identity tables above are the foundation.

---

## Future work

| Item | Status |
|------|--------|
| Rename `(shell)` → `(consumer)` | Deferred |
| Replace `NODE_ENV` guard with Clerk org-role check | Planned |
| Wire Pro UI to `lib/services/pro/` (Neon + Drizzle) | Planned |
| `pro.valgate.com` subdomain routing | Stub in [`middleware.ts`](../middleware.ts) |
| Shared `components/domain/` extractions | As needed |
| Monorepo / separate deploy | Not planned |

---

## Related docs

- [Next.js architecture reference](./nextjs-architecture.md)
- [Mock-to-backend pattern](./mock-to-backend-pattern.md) — how to replace Pro mock data with the real backend (Neon + Drizzle)
