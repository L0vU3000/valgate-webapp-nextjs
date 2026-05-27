# Pro mutations

Convex mutations used exclusively by **Valgate Professional** (`app/(pro)/pro/`).

## Purpose

Pro-only writes that do not belong in consumer mutations — e.g. client invites, manager assignments, cross-org work order routing.

## Conventions

- Reuse shared domain mutations where possible; only add Pro-specific mutations when the authorization model differs.
- Every mutation must verify the caller is a member of the **manager org** with sufficient role.
- Never mutate consumer-owned resources without an explicit client-org context.
- Name files by feature: `clients.ts`, `invites.ts`, `assignments.ts`.

## Example shape (future)

```ts
// convex/mutations/pro/invites.ts
export const inviteClientOrg = mutation({
  args: { managerOrgId: v.id("orgs"), email: v.string() },
  handler: async (ctx, args) => {
    // 1. Assert caller is manager org admin
    // 2. Create invite / link client org
  },
});
```

See [`docs/products.md`](../../../docs/products.md) for the full product boundary.
