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

### Shared schema — `convex/schema/`

Property, lease, documents, and identity tables are shared. Professional reads the same entities consumer writes.

Key identity primitives ([`convex/schema/identity.ts`](../convex/schema/identity.ts)):

- `orgs` — Clerk organizations
- `users` — Clerk users
- `org_members` — membership + roles for RLS

### Pro-only functions

```
convex/
  queries/pro/     ← aggregate reads across managed client orgs
  mutations/pro/   ← Pro-only writes (invites, assignments, etc.)
```

Pro queries are thin wrappers that enforce **"manager org member can access client org X"** using patterns in [`convex/rls.ts`](../convex/rls.ts).

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
| Wire Pro UI to `convex/queries/pro/` | Planned |
| `pro.valgate.com` subdomain routing | Stub in [`middleware.ts`](../middleware.ts) |
| Shared `components/domain/` extractions | As needed |
| Monorepo / separate deploy | Not planned |

---

## Related docs

- [Next.js architecture reference](./nextjs-architecture.md)
- [Mock-to-backend pattern](./mock-to-backend-pattern.md) — how to replace Pro mock data with Convex
