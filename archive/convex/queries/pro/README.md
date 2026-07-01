# Pro queries

Convex queries used exclusively by **Valgate Professional** (`app/(pro)/pro/`).

## Purpose

Aggregate reads across managed client orgs — e.g. list clients, cross-portfolio KPIs, compliance rollups.

## Conventions

- Import shared domain logic from `convex/queries/` (properties, documents, etc.) — do not duplicate query logic.
- Every query must verify the caller is a member of the **manager org** and authorized for the target **client org** (see `convex/rls.ts`).
- Name files by feature: `clients.ts`, `dashboard.ts`, `compliance.ts`.
- Export via `convex/queries/pro/index.ts` when the folder grows.

## Example shape (future)

```ts
// convex/queries/pro/clients.ts
export const listManagedClients = query({
  args: { managerOrgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // 1. Assert caller belongs to managerOrgId
    // 2. Return client orgs this manager org can access
  },
});
```

See [`docs/products.md`](../../../docs/products.md) for the full product boundary.
